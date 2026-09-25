FROM ubuntu:24.04@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3

ARG TARGETARCH
ARG NODE_VERSION=24.19.0
ARG SEA_NODE_VERSION=26.8.2
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git file xz-utils zip unzip build-essential python3 \
    pkg-config cmake libsecret-1-dev libdbus-1-dev libwayland-dev \
    imagemagick libnss3 libgtk-3-0t64 libgbm1 libasound2t64 libfuse2t64 \
    xvfb xauth dbus-x11 inotify-tools util-linux \
    && apt-get clean
RUN set -eu; \
    case "$TARGETARCH" in arm64) arch=arm64 ;; amd64) arch=x64 ;; *) exit 2 ;; esac; \
    for version in "$NODE_VERSION" "$SEA_NODE_VERSION"; do \
      archive="node-v$version-linux-$arch.tar.xz"; \
      curl -fsSLo "/tmp/$archive" "https://nodejs.org/dist/v$version/$archive"; \
      curl -fsSLo /tmp/SHASUMS256.txt "https://nodejs.org/dist/v$version/SHASUMS256.txt"; \
      cd /tmp; grep "  $archive$" SHASUMS256.txt | sha256sum -c -; \
      tar -xJf "$archive" -C /opt; \
      rm "$archive" SHASUMS256.txt; \
    done; \
    ln -s "/opt/node-v$NODE_VERSION-linux-$arch" /opt/node24; \
    ln -s "/opt/node-v$SEA_NODE_VERSION-linux-$arch" /opt/node26
ENV PATH="/opt/node24/bin:/root/.cargo/bin:${PATH}" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CARGO_BUILD_JOBS=2
RUN npm install -g pnpm@11.10.0
RUN curl --proto '=https' --tlsv1.2 -fsSLo /tmp/rustup-init.sh https://sh.rustup.rs \
    && sh /tmp/rustup-init.sh -y --profile minimal --default-toolchain 1.97.1 \
    && rm /tmp/rustup-init.sh
WORKDIR /work
