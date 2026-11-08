# Corpus report

Generated 2026-11-08T13:16:40.392Z

## Source

| Item | Value |
|---|---|
| Repository | `cilium/cilium` |
| Ref | `v1.20.4` |
| Commit | `beb276d2f38d4aadfda14710acf8d14a0f1ba723` |
| Retrieval route | tarball |
| Files pulled | 186 |
| Bytes | 1650968 |
| Licence | CC BY 4.0 (documentation); Apache-2.0 (code) |

## Sections

Parsed **1140** sections from 186 files, 152367 words. Anchors verified against the live site: **1128**, unpublished pages: 12, unmatched: 0.

Dropped:

- `too_short`: 731
- `too_long`: 0
- `unmapped_domain`: 57
- `empty`: 112

## Corpus

**561 questions** in the shipped corpus, **331** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 110 | 100 | met |
| Network Policy | 18% | 104 | 90 | met |
| Service Mesh | 16% | 93 | 80 | met |
| Network Observability | 10% | 55 | 50 | met |
| Installation and Configuration | 10% | 69 | 50 | met |
| Cluster Mesh | 10% | 55 | 50 | met |
| eBPF | 10% | 45 | 25 | met |
| BGP and External Networking | 6% | 30 | 30 | met |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 97
- `component-roles` — 12 _(thin)_
- `datapath-models` — 1 _(thin)_

**BGP and External Networking**

- `egress-gateway` — 16 _(thin)_
- `bgp-advertisement` — 7 _(thin)_
- `bgp-peering` — 5 _(thin)_
- `bgp-control-plane` — 2 _(thin)_

**Cluster Mesh**

- `global-services` — 18 _(thin)_
- `unmapped` — 16
- `mesh-setup` — 11 _(thin)_
- `mesh-benefits` — 10 _(thin)_

**eBPF**

- `ebpf-role` — 22 _(thin)_
- `bpf-maps` — 13 _(thin)_
- `unmapped` — 7
- `ebpf-program-model` — 3 _(thin)_

**Installation and Configuration**

- `unmapped` — 53
- `upgrade` — 11 _(thin)_
- `connectivity-test` — 5 _(thin)_

**Network Policy**

- `unmapped` — 78
- `policy-rule-structure` — 17 _(thin)_
- `policy-intent` — 9 _(thin)_

**Network Observability**

- `hubble-capabilities` — 38
- `hubble-cli` — 10 _(thin)_
- `l7-visibility` — 3 _(thin)_
- `unmapped` — 2
- `metrics` — 2 _(thin)_

**Service Mesh**

- `unmapped` — 58
- `ingress` — 17 _(thin)_
- `encryption` — 11 _(thin)_
- `gateway-api` — 5 _(thin)_
- `sidecar-versus-sidecarless` — 2 _(thin)_

</details>

| Yield source | Count |
|---|---|
| scenario | 231 |
| attribute | 145 |
| definition | 99 |
| contrast | 86 |

Scenario share: **41.2%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| judge | 176 |
| entail | 135 |
| quote | 11 |
| duplicate | 9 |

Judge histogram:

| Category | Count |
|---|---|
| distractors_too_obvious | 28 |
| good_exam_item | 679 |
| trivia_not_in_blueprint | 86 |
| wording_broken | 40 |
| ambiguity_two_correct | 2 |
| answer_not_determinable | 57 |

## Known weak points

76 of 561 questions (13.5%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `111af0cbc3a4c706` — architecture — An engineer is configuring Maglev for a service that may scale to around 500 backends. The
- `2b278021d1464ed0` — architecture — According to the verbose output, what is the NodePort range shown for the NodePort service
- `69bcbede817a9fa8` — architecture — An engineer runs `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | g
- `8e47aefd95c13d7d` — architecture — Which API calls does the operator use to create and attach a new ENI to the EC2 instance?
- `8e5497ab8912216d` — architecture — A team wants the CIDR list in loadBalancerSourceRanges to block traffic from certain CIDRs
- `98e7ecfeedc668ff` — architecture — A platform team runs Cilium on nodes whose devices are auto-detected, and Cilium selects m
- `bad80f0b23926d95` — architecture — You are enabling Cilium's bandwidth manager on a cluster and want to avoid the high latenc
- `bc0ef9f9f2db8d29` — architecture — An engineer wants to keep the default allow-list semantics of loadBalancerSourceRanges but
- `7d73aedc58406f02` — bgp — An engineer is configuring a CiliumBGPAdvertisement to advertise Pod CIDR ranges in a clus
- `a5d3bc3ed07b349c` — bgp — Which field is used to configure multiple gateway nodes within a single egress gateway pol
- `05d585f73e68c549` — cluster-mesh — In the excerpt's example, which deployment is used to curl the rebel-base global service f
- `198abce3e0a266b7` — cluster-mesh — You are using Cilium's Gateway API implementation and want to route traffic to a service t
- `2e883be1dde0f2c6` — cluster-mesh — You are preparing a cilium install command for a cluster whose PodCIDRs, like those of the
- `528d7149d7b6dbf5` — cluster-mesh — An engineer must expose the Cluster Mesh control plane and wants a stable LoadBalancer IP,
- `63823e7063020339` — cluster-mesh — After setting `service.cilium.io/affinity=local` in cluster 1, an engineer inspects endpoi
- `8651c3d468030793` — cluster-mesh — Which annotation, when added to an existing global service, stops that service from being 
- `b9f6f0825f69474b` — cluster-mesh — Which annotation key is used to specify the preferred endpoint destination for a global se
- `c65c43d26362c21f` — cluster-mesh — You are preparing the first AKS cluster for a Cluster Mesh and want Cilium to manage pod n
- `c937fa7014d637e9` — cluster-mesh — An engineer prefers to configure the native routing CIDR through the Cilium ConfigMap rath
- `f8f7a3f68bb0ed2e` — cluster-mesh — An engineer reads that MCS-API is built on two Kubernetes resources. Which pair does the e
- `1371730b0bdd58bd` — ebpf — A platform team wants Cilium to drop malicious or unexpected traffic as early as possible,
- `1926eda389a76d11` — ebpf — An engineer observes that a node is running out of capacity for its local endpoints. Accor
- `3fe78a0b6c28c9df` — ebpf — A network engineer is configuring Cilium to protect a node against Distributed Denial of S
- `4b2b133c23879094` — ebpf — An engineer is told that the Cilium Service LB maps hold load balancer entries for certain
- `5a67aee14817c259` — ebpf — Which of the following BPF maps is NOT affected by the `--bpf-map-dynamic-size-ratio` flag
- `78f3a8a7eb254371` — ebpf — According to the excerpt, what is the default size of the Service LB maps?
- `911430a3c97b9bb0` — ebpf — In the Cilium datapath, the Socket operations hook is attached to the root cgroup. What sp
- `a13d99c23b831278` — ebpf — Users report that connections to clusterIP services fail on a node. You suspect the BPF cg
- `b4c8498ad5c867ba` — ebpf — A platform team enables BPF masquerading on a cluster and wants to know which network devi
- `c23dcf1f3ae57803` — ebpf — An administrator is using systemd to manage the kubelet and wants guidance on the BPF file
- `e205c09cc80b7860` — ebpf — Which setting must be enabled for Cilium to probe the kernel and possibly use jiffies?
- `eb635bf16f46be11` — ebpf — An engineer runs `cilium status` inside a Cilium pod to check whether eBPF host-routing is
- `09f7b44f89559c60` — installation — A cluster runs Cilium in VXLAN overlay network mode on Linux hosts that have not been reco
- `25258311c07b0480` — installation — An operator adds a single inclusive label pattern to the identity-relevant label configura
- `3c99f5675449a516` — installation — Which field do CiliumNetworkPolicies use to match on pod labels in order to identify the s
- `3f3c3937d8729ff4` — installation — A team deploys Cilium using WireGuard for encryption and asks which UDP port must be permi
- `5e280140bac3427a` — installation — An operator wants Cilium to ignore the `statefulset.kubernetes.io/pod-name` label when com
- `659e9378095ccbe1` — installation — An engineer is debugging an Ingress issue and wants to verify if the request is reaching t
- `65bf072a103a839a` — installation — An engineer wants to inspect the applied L7 policy from the command line. Which command do
- `8158205fda5154c4` — installation — A request through your Ingress returns `no healthy upstream`. You inspect the `CiliumEnvoy
- `a6854cc7d6bcaa03` — installation — During troubleshooting, an engineer runs `kubectl get cec cilium-ingress-default-basic-ing
- `b3fd439387d02624` — installation — By default, which of the following does Cilium ignore when evaluating labels for identitie
- `da68852cecf8975e` — installation — When checking the Envoy Discovery Service for a backend, what naming convention does the E
- `f0f3dbd841b8a361` — installation — Which command does the excerpt present for a quick assessment of whether any pods are not 
- `5e6fab343b239c46` — network-policy — A cluster administrator notices that `XfrmInNoStates` errors are increasing after a key ro
- `70918bcfcf0b998f` — network-policy — A policy example in the excerpt allows ingress for nodes labelled type=ingress-worker on s
- `80f3c1ce7b399248` — network-policy — An engineer is preparing a Cilium installation that will use host policies and wants to pi
- `a1dd88d8141ef40c` — network-policy — Which XFRM error is described as Cilium dropping packets that would otherwise have left th
- `a6a0006dbecaf4d7` — network-policy — An engineer is designing an egress policy for endpoints with label env=prod. They want to 
- `a6ea2fe404760362` — network-policy — Which label is used in the example to define the pods that are part of the elasticsearch s
- `aa3bcbb23a132136` — network-policy — A platform team runs Cilium with WireGuard enabled on nodes that sit behind firewalls, and
- `ae60e6ead3ea7af4` — network-policy — An engineer wants to be able to list and delete policy rules later by a chosen identifier.
- `d4934fe7fe8e009a` — network-policy — An engineer is preparing to deploy the demo application for the first time. The guide note
- `e75a6fc9e7d67925` — network-policy — An engineer inspects the derivative policy generated for a ToGroups rule and wants to conf
- `ef723ee8992971a8` — network-policy — An engineer is deploying the demo application described in the guide to secure communicati
- `f5fdd29cfca22937` — network-policy — You need to determine whether the derivative policy generated from a ToGroups rule is actu
- `f632291f5c0806af` — network-policy — You are reviewing a derivative policy and want to trace it back to the ToGroups policy tha
- `fddea97dd4ba2db2` — network-policy — An engineer is writing a CiliumNetworkPolicy for endpoints with label env=prod. They want 
- `0406c752e9069e48` — observability — A network engineer wants to configure Hubble metrics to include the Kubernetes namespace n
- `459f5631b12ab900` — observability — What does Hubble build on top of in order to enable deep visibility into the communication
- `77a43824d9bb1533` — observability — An operator is troubleshooting why Hubble Relay cannot reach a Hubble instance on a partic
- `851a8ef5bb937f60` — observability — An engineer is investigating slow IP releases and wants latency figures for releasing an I
- `8b0bea1216628c26` — observability — A platform team runs Cilium 1.16 with Hubble metrics already enabled. They want the Hubble
- `9ff7fea2c305636a` — observability — A node is reported as short of addresses, and the operator must decide how many more IPs t
- `b2eb8c4b40454912` — observability — A platform team wants Hubble flows written straight into the container logs rather than in
- `ce142e7ce920fba3` — observability — An engineer wants to know which namespaces in the cluster have had network flows during th
- `3609a0ba0fa39d0e` — service-mesh — After applying a default deny policy, an engineer observes that the HTTP response to a den
- `5bacf65cef4c970b` — service-mesh — Which field is used to specify the IP address of a Cilium Gateway?
- `7e3e7d5c8d560787` — service-mesh — A colleague has retrieved the Cilium Identity for the echo Pod and now wants to check that
- `8cbdf3736112ea28` — service-mesh — An engineer applies a `CiliumClusterwideNetworkPolicy` to deny all traffic by default. Whe
- `a06cc546293e2986` — service-mesh — When you run `kubectl describe gateway <name>`, which condition type does the excerpt say 
- `a88b9a3468e458e2` — service-mesh — You want to load balance traffic destined to one Service across a group of backend Service
- `ace5ee02d23ee35f` — service-mesh — You have a local Kubernetes cluster running Cilium and Istio, and you want to follow the d
- `c28a41993412d6d6` — service-mesh — After listing all entries with the `cilium:mutual-auth` selector, you want to confirm that
- `c4efbbbdc8bc1810` — service-mesh — You are checking an HTTPRoute and want to confirm that the services it references were fou
- `eb7842579ba27879` — service-mesh — You have a local Kubernetes cluster running Cilium and Istio, and you want to follow the d

</details>

## Blind evaluation set

102 questions held out from the practising corpus, sourced from the public CNCF practice-exam repository. Never shown in practice or exam simulation; used only for blind scoring.

## What this report does not claim

- That these questions resemble the real exam. They are anchored to the documentation the exam is written
  against, which is a weaker and checkable claim.
- That every shipped answer is correct. The gates prove the answer is supported by the cited passage; they
  do not prove the passage was read correctly by the generator.
- That coverage is exam-realistic across competencies. Domain floors are enforced; per-competency balance is
  reported only indirectly through the competency field on each question.
