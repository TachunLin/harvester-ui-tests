
FROM cypress/base:16@sha256:f4d5f616e83ee6f37913ea18bc1bc4f483bd49b3d7353d04a555af034087b9ff

RUN apt-get install -y xauth

WORKDIR /harvester-ui-tests

COPY . /harvester-ui-tests

RUN npm install

ENV PATH /harvester-ui-tests/node_modules/.bin:$PATH

CMD ["./scripts/e2e"]
