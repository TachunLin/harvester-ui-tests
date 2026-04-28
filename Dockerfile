# 5.4.0 version overall with chart
# mc version RELEASE.2025-08-13T08-35-41Z - official MinIO release binary (glibc 2.31 compatible)
# source: https://dl.min.io/client/mc/release/linux-amd64/archive/mc.RELEASE.2025-08-13T08-35-41Z
ARG MC_VERSION=RELEASE.2025-08-13T08-35-41Z
ARG MC_SUM=01f866e9c5f9b87c2b09116fa5d7c06695b106242d829a8bb32990c00312e891

FROM cypress/base:16@sha256:f4d5f616e83ee6f37913ea18bc1bc4f483bd49b3d7353d04a555af034087b9ff

ARG MC_VERSION
ARG MC_SUM

RUN apt-get update
RUN apt-get install -y git xauth

# Download mc binary and verify against checksum defined in this Dockerfile (not fetched from internet).
# Build will abort if checksum does not match.
ADD "https://dl.min.io/client/mc/release/linux-amd64/archive/mc.${MC_VERSION}" /usr/local/bin/mc
RUN echo "${MC_SUM}  /usr/local/bin/mc" | sha256sum -c - && \
    chown root:root /usr/local/bin/mc && \
    chmod 0755 /usr/local/bin/mc

RUN git clone https://github.com/harvester/harvester-ui-tests.git

WORKDIR /harvester-ui-tests

COPY . /harvester-ui-tests

RUN npm install

ENV PATH /harvester-ui-tests/node_modules/.bin:$PATH

CMD ["./scripts/e2e"]