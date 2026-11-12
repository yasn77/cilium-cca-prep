/**
 * Central configuration for the corpus pipeline.
 *
 * Everything tunable lives here so a change to quotas or a pinned model shows up
 * in one place and in the diff of a pull request.
 */

/** The documentation ref the corpus is built from. Changing this invalidates every citation. */
export const docs = {
  repo: 'cilium/cilium',
  ref: 'v1.20.4',
  // Route to the rendered sources, used only when the GitHub tarball is unavailable.
  fallbackBase: 'https://docs.cilium.io/en/stable/_sources',
  liveBase: 'https://docs.cilium.io/en/stable',
};

/**
 * Model providers. Both blocks are optional at runtime: a missing credential
 * makes the corresponding stage a no-op rather than a failure, so the site can
 * always deploy.
 */
export const providers = {
  generator: {
    baseUrlEnv: 'LLM_BASE_URL',
    // nano-gpt carries both the chat models and SystemOne, so one credential
    // and one base URL serve the generator and the judge.
    defaultBaseUrl: 'https://nano-gpt.com/api/v1',
    modelEnv: 'LLM_MODEL',
    // Pinned deliberately: a floating "latest" makes every regeneration a
    // silent behaviour change and provenance stops meaning anything.
    //
    // Chosen by measurement, not price. tools/bench-models.mjs runs the real
    // prompt over a fixed section sample and counts what survives the real
    // validators:
    //
    //   deepseek/deepseek-v4.1-flash-1017            24/24  100%  ~7.0s/section
    //   deepseek/deepseek-v4.1-flash-1017-uncensored 23/24   96%  ~6.0s/section
    //   deepseek/deepseek-v4-flash-0423               6/12   50%  ~6.1s/section
    //   z-ai/glm-5.3-flash                            0/12    0%  (10k output, never parsed)
    //
    // The cheap models were cheap per token and expensive per usable question.
    defaultModel: 'deepseek/deepseek-v4.1-flash-1017',
    keyEnv: 'LLM_API_KEY',
    temperature: 0,
    // Measured on accepted candidates: median 399 tokens of JSON per question.
    // A batch of five plus a model that thinks first fits well inside this.
    maxTokens: 3000,
    // Requests in flight. A cloud gateway tolerates far more than a single
    // local GPU; GEN_CONCURRENCY=4 or lower is right for one box.
    defaultConcurrency: 8,
  },
  judge: {
    baseUrlEnv: 'TYPESAFE_BASE_URL',
    // OpenRouter serves SystemOne at /api/v1/systemone and maps a bare
    // `jev-latest` onto the typesafe/ namespace. It is the default because
    // nano-gpt's weekly quota blocks judging while generation carries on, and
    // llmgateway refuses typed decisions entirely.
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    model: 'jev-latest',
    modelEnv: 'TYPESAFE_MODEL',
    // Each gateway names the credential differently; the first one found wins.
    keyEnv: 'TYPESAFE_API_KEY',
    fallbackKeyEnvs: ['JUDGE_API_KEY', 'OPENROUTER_API_KEY', 'LLM_API_KEY'],
    // Measured flat with batch size in the reference client; 100 is cheap in time.
    batchSize: 100,
  },
};

/**
 * The eight exam domains as published on the Linux Foundation certification
 * page (page last modified 2026-07-27). Weights are percentages of the exam.
 *
 * Note: github.com/cncf/curriculum/blob/main/cca/README.md still lists five
 * domains at 20% each. That page's last content change was 2025-11-28 and the
 * certification page is the authoritative current statement, so the eight-domain
 * split is used here. See docs/DECISIONS.md.
 */
export const domains = {
  architecture: { weight: 20, floor: 100, label: 'Architecture' },
  'network-policy': { weight: 18, floor: 90, label: 'Network Policy' },
  'service-mesh': { weight: 16, floor: 80, label: 'Service Mesh' },
  observability: { weight: 10, floor: 50, label: 'Network Observability' },
  installation: { weight: 10, floor: 50, label: 'Installation and Configuration' },
  'cluster-mesh': { weight: 10, floor: 50, label: 'Cluster Mesh' },
  // eBPF is 10% of the exam but a tiny share of the documentation: at v1.20.4
  // there are only 18 verified sections, of which 9 exceed the 120-word
  // generation floor. A floor of 50 would fail forever or force the pipeline to
  // pad with trivia. This floor is what the source can actually support, and
  // the shortfall is stated here rather than hidden.
  ebpf: { weight: 10, floor: 25, label: 'eBPF', sourceLimited: true },
  bgp: { weight: 6, floor: 30, label: 'BGP and External Networking' },
};

export const quota = {
  perCompetencyMin: 25,
  perCompetencyMax: 40,
  scenarioMinShare: 0.25,
  corpusFloor: 500,
};

/**
 * Section-to-domain mapping. The blueprint's competency names do not appear
 * verbatim in the docs, so mapping is explicit and reviewed rather than
 * inferred. The first rule that matches wins, so order matters: put the
 * specific paths before the general ones.
 *
 * A section matching no rule is dropped and counted in the report. It is never
 * guessed at, because a question filed under the wrong domain skews both the
 * coverage report and the weighted exam simulation.
 */
export const domainRules = [
  // Highest priority first. Specific overrides must precede the broad path
  // rules they carve out of, or they never match.
  { match: /^network\/ebpf\//, domain: 'ebpf' },
  // eBPF appears across the docs; these specific sections are the conceptual
  // ones the blueprint's eBPF domain tests, not incidental mentions of bpf.
  { match: /masquerading\.rst$/, headingOnly: /ebpf-based/i, domain: 'ebpf' },
  { match: /^observability\/metrics\.rst$/, headingOnly: /^ebpf$/i, domain: 'ebpf' },
  { match: /^network\/kubernetes\/configuration\.rst$/, headingOnly: /bpf/i, domain: 'ebpf' },
  { match: /^network\/kubernetes\/kubeproxy-free\.rst$/, headingOnly: /bpf/i, domain: 'ebpf' },
  { match: /^operations\/performance\/tuning\.rst$/, headingOnly: /bpf/i, domain: 'ebpf' },
  { match: /^operations\/system_requirements\.rst$/, headingOnly: /bpf/i, domain: 'ebpf' },
  { match: /^overview\/component-overview\.rst$/, headingOnly: /^ebpf$/i, domain: 'ebpf' },
  { match: /^network\/policy\//, domain: 'network-policy' },
  { match: /^security\//, domain: 'network-policy' },
  { match: /^network\/servicemesh\//, domain: 'service-mesh' },
  { match: /^network\/kubernetes\/ingress/, domain: 'service-mesh' },
  { match: /^network\/kubernetes\/gateway-api/, domain: 'service-mesh' },
  { match: /^observability\//, domain: 'observability' },
  { match: /^internals\/hubble/, domain: 'observability' },
  { match: /^network\/clustermesh\//, domain: 'cluster-mesh' },
  { match: /^network\/concepts\/multi-cluster/, domain: 'cluster-mesh' },
  { match: /^network\/bgp-control-plane\//, domain: 'bgp' },
  { match: /^network\/bgp-toc/, domain: 'bgp' },
  { match: /^network\/egress-gateway\//, domain: 'bgp' },
  { match: /^network\/l2-announcements/, domain: 'bgp' },
  { match: /^network\/lb-ipam/, domain: 'bgp' },
  { match: /^network\/node-ipam/, domain: 'bgp' },
  { match: /^cheatsheet\.rst$/, domain: 'installation' },
  { match: /^network\/kubernetes\/(cnp|kpr|cilium-node)/, domain: 'installation' },
  { match: /^gettingstarted\//, domain: 'installation' },
  { match: /^operations\//, domain: 'installation' },
  { match: /^network\/concepts\/ipam\//, domain: 'architecture' },
  { match: /^network\/concepts\//, domain: 'architecture' },
  { match: /^network\/kubernetes\//, domain: 'architecture' },
  { match: /^overview\//, domain: 'architecture' },
  { match: /^internals\//, domain: 'architecture' },
];

/**
 * Competency mapping, keyed by domain then by a regex over the section heading.
 * The first match wins; a section with no competency match stays with an
 * empty competency and is excluded from competency quota checks.
 */
export const competencyRules = {
  architecture: [
    { match: /ipam|ip address management/i, id: 'ipam' },
    { match: /component|operator|agent|hubble/i, id: 'component-roles' },
    { match: /datapath|routing|masquerad|vxlan|geneve/i, id: 'datapath-models' },
    { match: /identity/i, id: 'identity-model' },
  ],
  'network-policy': [
    { match: /enforcement mode/i, id: 'policy-enforcement-modes' },
    { match: /identity/i, id: 'identity-model' },
    { match: /l7|layer 7|http|grpc|kafka/i, id: 'policy-rule-structure' },
    { match: /kubernetes network polic|networkpolicy/i, id: 'k8s-versus-cilium' },
    { match: /fqdn|dns/i, id: 'policy-rule-structure' },
    { match: /policy/i, id: 'policy-intent' },
  ],
  'service-mesh': [
    { match: /gateway api/i, id: 'gateway-api' },
    { match: /ingress/i, id: 'ingress' },
    { match: /encrypt|ipsec|wireguard|mtls|mutual/i, id: 'encryption' },
    { match: /sidecar/i, id: 'sidecar-versus-sidecarless' },
    { match: /service mesh/i, id: 'service-mesh-use-cases' },
  ],
  observability: [
    { match: /hubble ui/i, id: 'hubble-ui' },
    { match: /hubble cli|command line|observe/i, id: 'hubble-cli' },
    { match: /layer 7|l7/i, id: 'l7-visibility' },
    { match: /hubble/i, id: 'hubble-capabilities' },
    { match: /metric|prometheus|grafana/i, id: 'metrics' },
  ],
  installation: [
    { match: /kubeproxy|kube-proxy/i, id: 'kubeproxy-replacement' },
    { match: /connectivity test/i, id: 'connectivity-test' },
    { match: /status/i, id: 'status-monitoring' },
    { match: /helm|install/i, id: 'install' },
    { match: /upgrade/i, id: 'upgrade' },
    { match: /cli|config/i, id: 'cli-configuration' },
  ],
  'cluster-mesh': [
    { match: /global service|affinity/i, id: 'global-services' },
    { match: /load balanc/i, id: 'cross-cluster-load-balancing' },
    { match: /setup|prerequisite|requirement/i, id: 'mesh-setup' },
    { match: /cluster mesh|clustermesh/i, id: 'mesh-benefits' },
  ],
  ebpf: [
    { match: /map/i, id: 'bpf-maps' },
    { match: /iptables/i, id: 'ebpf-versus-iptables' },
    { match: /hook|xdp|tc|verifier|program/i, id: 'ebpf-program-model' },
    { match: /ebpf|bpf/i, id: 'ebpf-role' },
  ],
  bgp: [
    { match: /egress gateway/i, id: 'egress-gateway' },
    { match: /advertisement|advertise/i, id: 'bgp-advertisement' },
    { match: /peer|cluster config/i, id: 'bgp-peering' },
    { match: /l2 announcement/i, id: 'l2-announcements' },
    { match: /bgp/i, id: 'bgp-control-plane' },
  ],
};

/**
 * Core CCA Study Guide and official playlist documentation files.
 *
 * Prioritised during generation and checked by verify.mjs so overview pages are
 * never starved by long troubleshooting or reference chapters.
 */
export const blueprintFiles = [
  'overview/intro.rst',
  'overview/component-overview.rst',
  'gettingstarted/terminology.rst',
  'gettingstarted/k8s-install-default.rst',
  'gettingstarted/demo.rst',
  'cheatsheet.rst',
  'security/network/identity.rst',
  'security/policy/intro.rst',
  'security/policy/layer3.rst',
  'security/policy/layer4.rst',
  'security/policy/layer7.rst',
  'security/policy/kubernetes.rst',
  'security/policy/deny.rst',
  'network/ebpf/intro.rst',
  'network/ebpf/maps.rst',
  'network/ebpf/lifeofapacket.rst',
  'network/ebpf/iptables.rst',
  'network/concepts/routing.rst',
  'network/concepts/masquerading.rst',
  'network/concepts/ipam/index.rst',
  'network/concepts/ipam/cluster-pool.rst',
  'network/concepts/ipam/kubernetes.rst',
  'network/concepts/ipam/crd.rst',
  'network/concepts/ipam/eni.rst',
  'network/concepts/ipam/azure.rst',
  'network/concepts/ipam/multi-pool.rst',
  'network/kubernetes/intro.rst',
  'network/kubernetes/concepts.rst',
  'network/kubernetes/kubeproxy-free.rst',
  'network/kubernetes/bandwidth-manager.rst',
  'network/servicemesh/index.rst',
  'network/servicemesh/ingress.rst',
  'network/servicemesh/basic-ingress.rst',
  'network/servicemesh/ingress-reference.rst',
  'network/servicemesh/gateway-api/gateway-api.rst',
  'network/servicemesh/gateway-api/http.rst',
  'network/servicemesh/gateway-api/https.rst',
  'network/servicemesh/gateway-api/splitting.rst',
  'network/servicemesh/gateway-api/header.rst',
  'network/servicemesh/mutual-authentication/mutual-authentication.rst',
  'security/network/encryption.rst',
  'security/network/encryption-wireguard.rst',
  'security/network/encryption-ipsec.rst',
  'observability/visibility.rst',
  'observability/hubble/index.rst',
  'observability/hubble/setup.rst',
  'observability/hubble/hubble-cli.rst',
  'observability/hubble/hubble-ui.rst',
  'observability/grafana.rst',
  'network/clustermesh/intro.rst',
  'network/clustermesh/setup.rst',
  'network/clustermesh/global-services.rst',
  'network/clustermesh/affinity.rst',
  'network/clustermesh/load-balancing.rst',
  'network/clustermesh/policy.rst',
  'network/bgp-control-plane/bgp-control-plane.rst',
  'network/bgp-control-plane/bgp-control-plane-configuration.rst',
  'network/bgp-control-plane/bgp-control-plane-operation.rst',
  'network/egress-gateway/egress-gateway.rst',
  'network/l2-announcements.rst',
  'network/lb-ipam.rst',
  'operations/performance/tuning.rst',
  'operations/troubleshooting.rst',
];

/** Paths under Documentation/ that are in scope for question generation. */
export const includePaths = [
  /^cheatsheet\.rst$/,
  /^gettingstarted\//,
  /^overview\//,
  /^network\//,
  /^security\//,
  /^observability\//,
  /^operations\//,
];

/** Paths that are generated, vendored, out-of-curriculum, or not prose and must be excluded. */
export const excludePaths = [
  /^contributing\//,
  /^cmdref\//,
  /^_api\//,
  /^images\//,
  /^community\//,
  /^labs\//,
  /^internals\//,
  /^network\/kubernetes\/local-redirect-policy\.rst$/,
  /^network\/kubernetes\/kata\.rst$/,
  /^network\/servicemesh\/istio\.rst$/,
  /^network\/clustermesh\/mcsapi\.rst$/,
  /^network\/clustermesh\/(aks|eks|gke)-clustermesh-prep\.rst$/,
  /^security\/(aws|azure|cassandra|elasticsearch|grpc|memcached|threat-model|restrict-pod-access|host-firewall|tls-visibility)\.rst$/,
  /^operations\/performance\/(scalability|benchmark)/,
  /^operations\/(upgrade|system_requirements|troubleshooting_servicemesh)/,
  /^network\/egress-gateway\/egress-gateway-troubleshooting\.rst$/,
  /^observability\/metrics\.rst$/,
  /^observability\/hubble\/configuration\/tls\.rst$/,
  /^network\/servicemesh\/envoy-(traffic-management|traffic-shifting|circuit-breaker)\.rst$/,
  /^network\/(bird|kube-router|multicast|vtep)\.rst$/,
];

export const chunking = {
  // Overview pages often use concise 50–100 word subsections; setting minWords
  // to 50 keeps foundational sections eligible instead of dropping them.
  minWords: 50,
  maxWords: 2000,
};

export const schemaVersion = 1;
