# Corpus report

Generated 2026-11-08T18:42:43.168Z

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

Parsed **1141** sections from 186 files, 156162 words. Anchors verified against the live site: **1129**, unpublished pages: 12, unmatched: 0.

Dropped:

- `too_short`: 718
- `too_long`: 0
- `unmapped_domain`: 57
- `empty`: 111

## Corpus

**683 questions** in the shipped corpus, **905** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 154 | 100 | met |
| Network Policy | 18% | 104 | 90 | met |
| Service Mesh | 16% | 114 | 80 | met |
| Network Observability | 10% | 60 | 50 | met |
| Installation and Configuration | 10% | 77 | 50 | met |
| Cluster Mesh | 10% | 67 | 50 | met |
| eBPF | 10% | 26 | 25 | met |
| BGP and External Networking | 6% | 81 | 30 | met |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 145
- `component-roles` — 8 _(thin)_
- `datapath-models` — 1 _(thin)_

**BGP and External Networking**

- `bgp-peering` — 27
- `bgp-advertisement` — 22 _(thin)_
- `egress-gateway` — 20 _(thin)_
- `bgp-control-plane` — 12 _(thin)_

**Cluster Mesh**

- `unmapped` — 24
- `mesh-benefits` — 23 _(thin)_
- `global-services` — 18 _(thin)_
- `mesh-setup` — 2 _(thin)_

**eBPF**

- `unmapped` — 12
- `ebpf-role` — 10 _(thin)_
- `bpf-maps` — 3 _(thin)_
- `ebpf-program-model` — 1 _(thin)_

**Installation and Configuration**

- `unmapped` — 57
- `upgrade` — 8 _(thin)_
- `install` — 6 _(thin)_
- `cli-configuration` — 5 _(thin)_
- `connectivity-test` — 1 _(thin)_

**Network Policy**

- `unmapped` — 75
- `policy-rule-structure` — 24 _(thin)_
- `policy-intent` — 4 _(thin)_
- `identity-model` — 1 _(thin)_

**Network Observability**

- `hubble-capabilities` — 32
- `hubble-cli` — 19 _(thin)_
- `l7-visibility` — 4 _(thin)_
- `unmapped` — 3
- `metrics` — 2 _(thin)_

**Service Mesh**

- `unmapped` — 73
- `ingress` — 21 _(thin)_
- `encryption` — 10 _(thin)_
- `sidecar-versus-sidecarless` — 6 _(thin)_
- `gateway-api` — 4 _(thin)_

</details>

| Yield source | Count |
|---|---|
| scenario | 290 |
| attribute | 187 |
| definition | 115 |
| contrast | 91 |

Scenario share: **42.5%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| shape | 409 |
| judge | 250 |
| entail | 211 |
| duplicate | 24 |
| quote | 11 |

Judge histogram:

| Category | Count |
|---|---|
| distractors_too_obvious | 50 |
| good_exam_item | 1174 |
| trivia_not_in_blueprint | 177 |
| wording_broken | 66 |
| ambiguity_two_correct | 3 |
| answer_not_determinable | 118 |

## Known weak points

101 of 683 questions (14.8%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `2ba10100a28ba3ba` — architecture — An engineer sets `monitor-aggregation` to `medium` and wants to ensure that, on average, o
- `39ba7c9fe0ccfa0c` — architecture — In a CiliumLocalRedirectPolicy with a serviceMatcher, which field selects the backend pods
- `43bb37c7e0b646d7` — architecture — An engineer wants to reduce per-packet latency by pre-allocating map entries, accepting th
- `47fa56912f3b7898` — architecture — An engineer wants pods in namespace `empire` to draw IPv4 addresses from one pool and IPv6
- `4e5ab41f5dce0b32` — architecture — A Cilium operator is creating an ENI. Which two API calls does it use to create and attach
- `69bcbede817a9fa8` — architecture — An engineer runs `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | g
- `7332745f242d3aee` — architecture — Which Helm values are required to enable per-service DSR with IPIP dispatch using the serv
- `80ab674774cdb14e` — architecture — Which annotation values are accepted by service.cilium.io/src-ranges-policy to control whe
- `89686573040820c3` — architecture — On a cluster with only Cilium VXLAN enabled and an underlying network MTU of 1500, an engi
- `8e47aefd95c13d7d` — architecture — Which API calls does the operator use to create and attach a new ENI to the EC2 instance?
- `8e5497ab8912216d` — architecture — A team wants the CIDR list in loadBalancerSourceRanges to block traffic from certain CIDRs
- `98e7ecfeedc668ff` — architecture — A platform team runs Cilium on nodes whose devices are auto-detected, and Cilium selects m
- `b285c0049be314d2` — architecture — Which two packages does each node need installed in order to run NodePort XDP on AWS with 
- `c3361b7fd271dd85` — architecture — An engineer wants the operator-driven migration to create the multi-pool pool under a name
- `d588e093e6a7ff4f` — architecture — Which Helm values are required to opt into DSR IPIP on a per-service basis through the ser
- `e0a57b1010f1d20d` — architecture — In a serviceMatcher policy, which field selects the backend pods where traffic is redirect
- `e3653c4b9e5709c3` — architecture — An engineer wants to prevent Cilium from creating the NodePort and ClusterIP services that
- `465a49dfebaa71ef` — bgp — Which field in a CiliumBGPPeerConfig is used to configure an RFC-2385 TCP MD5 password for
- `629f919e9b58d369` — bgp — A platform team is deploying Kubernetes clusters in datacenter networks and wants BGP fail
- `674c0160083b5815` — bgp — Which field in the BGP peer configuration sets the HoldTimer?
- `6e17b4a815d4997b` — bgp — Which timer parameter has a default of 120 seconds?
- `7d73aedc58406f02` — bgp — An engineer is configuring a CiliumBGPAdvertisement to advertise Pod CIDR ranges in a clus
- `9c08bf6eca3f0b89` — bgp — Which advertisementType in a CiliumBGPAdvertisement is used to advertise IP addresses assi
- `a5d3bc3ed07b349c` — bgp — Which field is used to configure multiple gateway nodes within a single egress gateway pol
- `f04e37d24c7b3d81` — bgp — Which field of the CiliumBGPPeerConfig resource carries the time advertised to the peer wi
- `f634d6123d0571ff` — bgp — Which pair of fields on a CiliumBGPAdvertisement controls the advertised prefix length for
- `198abce3e0a266b7` — cluster-mesh — You are using Cilium's Gateway API implementation and want to route traffic to a service t
- `237c216a1f45d8c1` — cluster-mesh — Which resource must an engineer create in order to export a Service through the Multi-Clus
- `63823e7063020339` — cluster-mesh — After setting `service.cilium.io/affinity=local` in cluster 1, an engineer inspects endpoi
- `8651c3d468030793` — cluster-mesh — Which annotation, when added to an existing global service, stops that service from being 
- `9c663ec30e24422d` — cluster-mesh — A pod has a hostname defined via a StatefulSet and belongs to an exported Service rebel-ba
- `b49d989d402738a7` — cluster-mesh — An engineer is choosing how to expose the Cluster Mesh control plane. They want a stable L
- `b9f6f0825f69474b` — cluster-mesh — Which annotation key is used to specify the preferred endpoint destination for a global se
- `c65c43d26362c21f` — cluster-mesh — You are preparing the first AKS cluster for a Cluster Mesh and want Cilium to manage pod n
- `d031e8bfe1dd77c5` — cluster-mesh — Which clustermesh.apiserver.service.type option requires ClusterIPs to be routable between
- `1371730b0bdd58bd` — ebpf — A platform team wants Cilium to drop malicious or unexpected traffic as early as possible,
- `18fba1c24c40d05a` — ebpf — A Cilium datapath designer wants a BPF program that inspects packet data at the earliest p
- `1926eda389a76d11` — ebpf — An engineer observes that a node is running out of capacity for its local endpoints. Accor
- `3fe78a0b6c28c9df` — ebpf — A network engineer is configuring Cilium to protect a node against Distributed Denial of S
- `911430a3c97b9bb0` — ebpf — In the Cilium datapath, the Socket operations hook is attached to the root cgroup. What sp
- `a13d99c23b831278` — ebpf — Users report that connections to clusterIP services fail on a node. You suspect the BPF cg
- `b4c8498ad5c867ba` — ebpf — A platform team enables BPF masquerading on a cluster and wants to know which network devi
- `e205c09cc80b7860` — ebpf — Which setting must be enabled for Cilium to probe the kernel and possibly use jiffies?
- `eb635bf16f46be11` — ebpf — An engineer runs `cilium status` inside a Cilium pod to check whether eBPF host-routing is
- `05a4ecb43eca8d24` — installation — A benchmark run reports a total transfer rate of 32 accumulated connections. Which metric 
- `09f7b44f89559c60` — installation — A cluster runs Cilium in VXLAN overlay network mode on Linux hosts that have not been reco
- `2fe10c3d8cf31023` — installation — An engineer is reviewing the ports that should be available on each Cilium node and wants 
- `3c99f5675449a516` — installation — Which field do CiliumNetworkPolicies use to match on pod labels in order to identify the s
- `3f3c3937d8729ff4` — installation — A team deploys Cilium using WireGuard for encryption and asks which UDP port must be permi
- `659e9378095ccbe1` — installation — An engineer is debugging an Ingress issue and wants to verify if the request is reaching t
- `8843b2c78b19a81d` — installation — A team is evaluating how many request/response messages per second can be transmitted over
- `8dd5943c6e6b430a` — installation — A cluster uses Cilium in VXLAN overlay network mode on Linux hosts that have not been reco
- `9348d9d9def000b6` — installation — A benchmark measures the number of connections per second that can be established in seque
- `a64ba647e4d57364` — installation — An engineer is preparing firewall rules for a Cilium cluster that uses WireGuard encryptio
- `a6854cc7d6bcaa03` — installation — During troubleshooting, an engineer runs `kubectl get cec cilium-ingress-default-basic-ing
- `b3fd439387d02624` — installation — By default, which of the following does Cilium ignore when evaluating labels for identitie
- `c220cd99cfe13e25` — installation — An engineer deploys Cilium with WireGuard encryption on nodes behind a restrictive firewal
- `caadee6363c83ea4` — installation — You want to keep the any-cluster behaviour for a single CiliumNetworkPolicy even though `p
- `cd26eb87b8bab42c` — installation — A cluster uses Cilium in VXLAN overlay network mode, and Linux has not been configured oth
- `d6da07fbf00cf725` — installation — Which port is described as the Mutual Authentication port that should be available on each
- `da68852cecf8975e` — installation — When checking the Envoy Discovery Service for a backend, what naming convention does the E
- `2ce7b40dff281619` — network-policy — An engineer deploys the Cloud City demo and wants to confirm that the door manager service
- `5e6fab343b239c46` — network-policy — A cluster administrator notices that `XfrmInNoStates` errors are increasing after a key ro
- `6d9cd2c4983f7386` — network-policy — A Cilium log contains a warning similar to `Device eth0 does not exist`. Which Helm settin
- `72f28fc684a93ee5` — network-policy — In the policy shown, which section causes the rule to apply to connections coming from pod
- `a1dd88d8141ef40c` — network-policy — Which XFRM error is described as Cilium dropping packets that would otherwise have left th
- `a6a0006dbecaf4d7` — network-policy — An engineer is designing an egress policy for endpoints with label env=prod. They want to 
- `a6ea2fe404760362` — network-policy — Which label is used in the example to define the pods that are part of the elasticsearch s
- `aa3bcbb23a132136` — network-policy — A platform team runs Cilium with WireGuard enabled on nodes that sit behind firewalls, and
- `d4934fe7fe8e009a` — network-policy — An engineer is preparing to deploy the demo application for the first time. The guide note
- `f5fdd29cfca22937` — network-policy — You need to determine whether the derivative policy generated from a ToGroups rule is actu
- `fddea97dd4ba2db2` — network-policy — An engineer is writing a CiliumNetworkPolicy for endpoints with label env=prod. They want 
- `0406c752e9069e48` — observability — A network engineer wants to configure Hubble metrics to include the Kubernetes namespace n
- `1cd4c5133fa3b940` — observability — You are installing Cilium with Helm and want Hubble to export a custom set of dynamic metr
- `459f5631b12ab900` — observability — What does Hubble build on top of in order to enable deep visibility into the communication
- `45d72eb3bfb5c5fb` — observability — An engineer wants a list of namespaces that had network flows within the last one hour. Wh
- `851a8ef5bb937f60` — observability — An engineer is investigating slow IP releases and wants latency figures for releasing an I
- `8b0bea1216628c26` — observability — A platform team runs Cilium 1.16 with Hubble metrics already enabled. They want the Hubble
- `9ff7fea2c305636a` — observability — A node is reported as short of addresses, and the operator must decide how many more IPs t
- `b2eb8c4b40454912` — observability — A platform team wants Hubble flows written straight into the container logs rather than in
- `c0d9b33f885d08ab` — observability — An engineer wants to retrieve a continuous stream of flow related events from the Observer
- `ce142e7ce920fba3` — observability — An engineer wants to know which namespaces in the cluster have had network flows during th
- `e9b526cd8d935bc4` — observability — A tool needs a summary of the information that GetNodes would return, without retrieving t
- `07aa7c31eead4d9d` — service-mesh — Which resource kind is defined by the envoy-traffic-management-test.yaml file to configure
- `175ed6c3580a4b31` — service-mesh — An engineer runs `kubectl get cep -l app=echo -o=jsonpath='{.items[0].status.identity.id}'
- `26de10fc6cf5877b` — service-mesh — An engineer wants to expose the Cilium ingress controller Envoy listener on the host netwo
- `3609a0ba0fa39d0e` — service-mesh — After applying a default deny policy, an engineer observes that the HTTP response to a den
- `4016973c94f97897` — service-mesh — An engineer enables the Cilium ingress controller in host network mode and does not set in
- `47d1ca85a8c1636b` — service-mesh — In a RequestHeaderModifier filter, which action is used to change the value of an existing
- `5bacf65cef4c970b` — service-mesh — Which field is used to specify the IP address of a Cilium Gateway?
- `7e3e7d5c8d560787` — service-mesh — A colleague has retrieved the Cilium Identity for the echo Pod and now wants to check that
- `8cbdf3736112ea28` — service-mesh — An engineer applies a `CiliumClusterwideNetworkPolicy` to deny all traffic by default. Whe
- `ace5ee02d23ee35f` — service-mesh — You have a local Kubernetes cluster running Cilium and Istio, and you want to follow the d
- `b44e7c47c5a088dd` — service-mesh — An engineer wants to pin a Cilium Gateway to a specific IP address using the Gateway API's
- `c4efbbbdc8bc1810` — service-mesh — You are checking an HTTPRoute and want to confirm that the services it references were fou
- `d63b1dcec341efcc` — service-mesh — In a Cilium Gateway API RequestHeaderModifier filter, which keyword is used to delete head
- `e32948a7b455801d` — service-mesh — A Cilium Gateway API HTTPRoute includes a RequestHeaderModifier filter with the configurat
- `e4a7de15750109cd` — service-mesh — Which condition type indicates that all referenced secrets were found and have permission 
- `eb7842579ba27879` — service-mesh — You have a local Kubernetes cluster running Cilium and Istio, and you want to follow the d
- `f3025dcb567a41bb` — service-mesh — An engineer is exposing Cilium's Envoy DaemonSet through a Loadbalancer Service in a clust
- …and 1 more

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
