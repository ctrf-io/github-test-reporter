These certificate and private-key files are public test fixtures, used only by
the local HTTPS server in `__tests__/github/proxy.test.ts`. They contain no
production credentials. The test child process trusts this certificate through
`NODE_EXTRA_CA_CERTS`; TLS certificate verification remains enabled.
