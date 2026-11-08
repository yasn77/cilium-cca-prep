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
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelEnv: 'LLM_MODEL',
    // Pinned deliberately. A floating "latest" makes every corpus regeneration a
    // silent behaviour change, and provenance stops meaning anything.
    defaultModel: 'gpt-4.1-mini',
    keyEnv: 'LLM_API_KEY',
    temperature: 0,
    maxTokens: 2500,
  },
  judge: {
    baseUrlEnv: 'TYPESAFE_BASE_URL',
    defaultBaseUrl: 'https://api.typesafe.ai',
    model: 'jev-latest',
    // Falls back to the generator key so a single gateway can serve both.
    keyEnv: 'TYPESAFE_API_KEY',
    fallbackKeyEnv: 'LLM_API_KEY',
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
  ebpf: { weight: 10, floor: 50, label: 'eBPF' },
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
  { match: /^network\/l2-announcements\//, domain: 'bgp' },
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

/** Paths under Documentation/ that are in scope for question generation. */
export const includePaths = [
  /^gettingstarted\//,
  /^overview\//,
  /^network\//,
  /^security\//,
  /^observability\//,
  /^operations\//,
  /^internals\//,
];

/** Paths that are generated, vendored or not prose and must be excluded. */
export const excludePaths = [
  /^contributing\//,
  /^cmdref\//,
  /^_api\//,
  /^images\//,
  /^community\//,
  /^labs\//,
];

export const chunking = {
  // Sections much below ~120 words are usually a one-line stub with nothing to
  // ask about; anything above maxWords is a whole page with many ideas in it.
  minWords: 120,
  maxWords: 2000,
};

export const schemaVersion = 1;
