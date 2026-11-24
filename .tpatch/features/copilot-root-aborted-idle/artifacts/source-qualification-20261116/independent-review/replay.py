import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

OUT = Path(__file__).parent
TARGET = "cf9ef8999bb82d52c622bacdb8441170b8398301"
MAIN = "0490e7bb2753ee455d58f9832f6ea943af81b0e0"
UPSTREAM = "783581d461dc72cdd8f78fc8abb4ad536dfc4547"
ROOTS = [
    ("device-session-release", "fe6a486505"),
    ("copilot-session-import", "edaafaa1d0"),
    ("scanner-canonical-path-exclusion", "d7ff2a4539"),
    ("workspace-handoff-recovery", "8c6c1e8bad"),
    ("copilot-native-ingress-supervision", "0c550b8487"),
    ("copilot-text-generation-failure-diagnostics", "62c69bff27"),
    ("copilot-root-aborted-idle", TARGET),
]


def git(*args, data=None, env=None, check=True):
    p = subprocess.run(["git", *args], input=data, capture_output=True, env=env)
    if check and p.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {p.stderr.decode()}")
    return p


def read(path, ref=TARGET):
    return git("show", f"{ref}:{path}").stdout


def artifact(slug, name, ref=TARGET):
    return read(f".tpatch/features/{slug}/artifacts/{name}", ref)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def generation(slug, ref=TARGET):
    d = json.loads(artifact(slug, "patch-generations.json", ref))
    return next(g for g in d["generations"] if g["generation"] == d["current_generation"])


def entries(ref, env=None):
    result = {}
    for row in git("ls-tree", "-r", "-z", ref, env=env).stdout.split(b"\0"):
        if not row:
            continue
        meta, name = row.split(b"\t", 1)
        path = name.decode()
        if path == ".tpatch" or path.startswith(".tpatch/"):
            continue
        mode, kind, oid = meta.decode().split()
        result[path] = (mode, kind, oid)
    return result


class Index:
    def __init__(self, base):
        fd, self.path = tempfile.mkstemp(prefix="review-index-", dir=OUT)
        os.close(fd)
        os.unlink(self.path)
        self.env = {**os.environ, "GIT_INDEX_FILE": self.path}
        git("read-tree", base, env=self.env)

    def close(self):
        for suffix in ["", ".lock"]:
            Path(self.path + suffix).unlink(missing_ok=True)

    def tree(self):
        return git("write-tree", env=self.env).stdout.decode().strip()

    def residual(self, target):
        current, expected = entries(self.tree()), entries(target)
        return [
            {"path": p, "actual": current.get(p), "expected": expected.get(p)}
            for p in sorted(current.keys() | expected.keys())
            if current.get(p) != expected.get(p)
        ]

    def canonical(self, patch, allow_present=False):
        outcomes = []
        sections = patch.split(b"diff --git ")
        assert not sections[0].strip()
        for body in sections[1:]:
            section = b"diff --git " + body
            name = body.split(b"\n", 1)[0].decode()
            p = git("apply", "--cached", "--check", "--whitespace=nowarn", "-", data=section, env=self.env, check=False)
            if p.returncode == 0:
                git("apply", "--cached", "--whitespace=nowarn", "-", data=section, env=self.env)
                outcomes.append({"section": name, "result": "forward"})
            elif allow_present and git("apply", "--cached", "--check", "--reverse", "-", data=section, env=self.env, check=False).returncode == 0:
                outcomes.append({"section": name, "result": "already-present-strict-reverse"})
            else:
                raise RuntimeError(f"canonical section {name}: {p.stderr.decode()}")
        return outcomes

    def recipe(self, data):
        outcomes = []
        for op in json.loads(data)["operations"]:
            kind, path = op["type"], op["path"]
            if kind == "ensure-directory":
                continue
            old = git("show", f":{path}", env=self.env, check=False)
            present = old.returncode == 0
            content = old.stdout
            if "preimage_hash" in op:
                expected = op["preimage_hash"]
                actual = "sha256:" + sha(content) if present else ""
                assert actual == expected, (path, actual, expected)
            if kind == "write-file":
                content = op["content"].encode()
            elif kind == "replace-in-file":
                assert op["search"].encode() in content, path
                content = content.replace(op["search"].encode(), op["replace"].encode(), 1)
            elif kind == "append-file":
                content += op["content"].encode()
            else:
                raise RuntimeError(f"Unsupported operation {kind}")
            meta = git("ls-files", "--stage", "--", path, env=self.env).stdout.decode()
            mode = meta.split()[0] if meta else "100644"
            oid = git("hash-object", "-w", "--stdin", data=content).stdout.decode().strip()
            git("update-index", "--add", "--cacheinfo", mode, oid, path, env=self.env)
            outcomes.append({"path": path, "type": kind, "mode": mode})
        return outcomes


def independent_roots():
    rows = []
    for slug, landing in ROOTS:
        row = {"slug": slug, "landing": git("rev-parse", landing).stdout.decode().strip()}
        gen = generation(slug)
        patch, recipe = artifact(slug, "post-apply.patch"), artifact(slug, "apply-recipe.json")
        row.update(base=gen["base_commit"], patch_sha256=sha(patch), recipe_sha256=sha(recipe), generation=gen["generation"])
        message = git("show", "-s", "--format=%B", landing).stdout
        trailers = git("interpret-trailers", "--parse", data=message).stdout.decode()
        row["parsed_trailers"] = trailers
        expected = {
            "Tpatch-Feature": slug,
            "Tpatch-Patch-SHA": sha(patch),
            "Tpatch-Recipe-SHA": sha(recipe),
            "Tpatch-Base-Commit": gen["base_commit"],
        }
        parsed = {}
        for line in trailers.splitlines():
            k, v = line.split(":", 1)
            parsed.setdefault(k, []).append(v.strip())
        row["trailers_exact"] = all(parsed.get(k) == [v] for k, v in expected.items())
        row["manifest_hashes_exact"] = gen["patch_sha256"] == sha(patch) and gen["recipe_sha256"] == sha(recipe)
        row["landing_parents"] = git("show", "-s", "--format=%P", landing).stdout.decode().split()
        row["base_is_exact_first_parent"] = row["landing_parents"] == [gen["base_commit"]]
        row["parent_generations"] = []
        status = json.loads(read(f".tpatch/features/{slug}/status.json"))
        declared = {d["slug"]: d for d in status.get("depends_on", [])}
        captured = {d["slug"]: d for d in gen.get("dependencies", [])}
        for parent in sorted(declared.keys() | captured.keys()):
            dep = captured.get(parent)
            pg = generation(parent)
            pp, pr = artifact(parent, "post-apply.patch"), artifact(parent, "apply-recipe.json")
            bg = generation(parent, gen["base_commit"])
            bp = artifact(parent, "post-apply.patch", gen["base_commit"])
            br = artifact(parent, "apply-recipe.json", gen["base_commit"])
            row["parent_generations"].append({
                "slug": parent, "captured": dep,
                "current_generation": pg["generation"],
                "patch_sha256": sha(pp), "recipe_sha256": sha(pr),
                "captured_exact": dep is not None and dep["parent_generation"] == pg["generation"] and dep["parent_patch_sha256"] == sha(pp) and dep["parent_recipe_sha256"] == sha(pr),
                "current_manifest_recipe_sha256": pg["recipe_sha256"],
                "captured_matches_parent_manifest": dep is not None and dep["parent_generation"] == pg["generation"] and dep["parent_patch_sha256"] == pg["patch_sha256"] and dep["parent_recipe_sha256"] == pg["recipe_sha256"],
                "base_generation": bg["generation"],
                "changed_between_recorded_base_and_target": bg != pg or bp != pp or br != pr,
                "changed_since_main": git("diff", "--quiet", MAIN, TARGET, "--", f".tpatch/features/{parent}/artifacts/patch-generations.json", check=False).returncode != 0,
            })
        for method, data in [("canonical", patch), ("recipe", recipe)]:
            idx = Index(gen["base_commit"])
            try:
                outcomes = getattr(idx, method)(data)
                row[method] = {"tree": idx.tree(), "residual": idx.residual(landing), "operations": outcomes}
                row[method]["exact"] = not row[method]["residual"]
            except Exception as e:
                row[method] = {"exact": False, "error": str(e)}
            finally:
                idx.close()
        rows.append(row)
    return rows


def compose(method="canonical", intended=False):
    idx = Index(MAIN)
    rows = []
    try:
        if intended:
            data = Path(os.environ["TPATCH_INTENDED_PATCH"]).read_bytes()
            rows.append({"intended_patch_sha256": sha(data), "operations": idx.canonical(data)})
        for slug, landing in ROOTS:
            if intended and slug == "copilot-root-aborted-idle":
                continue
            if slug == "copilot-text-generation-failure-diagnostics":
                boundary = git("diff", "--binary", "83efed3d9c^", "83efed3d9c", "--", ".", ":!.tpatch").stdout
                rows.append({"boundary_commit": "83efed3d9c", "operations": idx.canonical(boundary)})
            data = artifact(slug, "post-apply.patch" if method == "canonical" else "apply-recipe.json")
            rows.append({"slug": slug, "operations": getattr(idx, method)(data)})
        return {"base": MAIN, "target": TARGET, "method": method, "steps": rows, "tree": idx.tree(), "residual": idx.residual(TARGET)}
    except Exception as e:
        return {"base": MAIN, "steps": rows, "error": str(e)}
    finally:
        idx.close()


def upstream():
    proof = json.loads(artifact("copilot-native-ingress-supervision", "source-qualification-20261106/canonical-source-proof.json"))
    idx = Index(UPSTREAM)
    rows = []
    try:
        for slug in proof["orderedRoots"]:
            rows.append({"slug": slug, "patch_sha256": sha(artifact(slug, "post-apply.patch")), "operations": idx.canonical(artifact(slug, "post-apply.patch"), True)})
        # The historical proof includes native ingress; independently add the other candidate roots.
        for slug, landing in ROOTS:
            if slug == "copilot-native-ingress-supervision":
                continue
            if slug == "copilot-text-generation-failure-diagnostics":
                boundary = git("diff", "--binary", "83efed3d9c^", "83efed3d9c", "--", ".", ":!.tpatch").stdout
                rows.append({"boundary_commit": "83efed3d9c", "operations": idx.canonical(boundary, True)})
            rows.append({"slug": slug, "operations": idx.canonical(artifact(slug, "post-apply.patch"), True)})
        return {"base": UPSTREAM, "target": TARGET, "steps": rows, "tree": idx.tree(), "residual": idx.residual(TARGET)}
    except Exception as e:
        return {"base": UPSTREAM, "steps": rows, "error": str(e)}
    finally:
        idx.close()


report = {
    "candidate": TARGET, "frozen_main": MAIN, "pinned_upstream": UPSTREAM,
    "exclusions": [".tpatch administrative metadata only"],
    "includes_file_modes": True,
    "roots": independent_roots(),
    "composition": compose(),
    "recipe_composition": compose("recipe"),
    "intended_patch_composition": compose(intended=True),
    "upstream_composition": upstream(),
}
(OUT / "replay.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "roots": [{"slug": r["slug"], "trailers": r["trailers_exact"], "canonical": r["canonical"]["exact"], "recipe": r["recipe"]["exact"], "parents": r["parent_generations"]} for r in report["roots"]],
    "composition": {k: v for k, v in report["composition"].items() if k != "steps"},
    "upstream_composition": {k: v for k, v in report["upstream_composition"].items() if k != "steps"},
}, indent=2))
