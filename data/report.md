# Corpus report

Generated 2026-11-12T18:02:01.207Z

## Source

| Item | Value |
|---|---|
| Repository | `cilium/cilium` |
| Ref | `v1.20.4` |
| Commit | `beb276d2f38d4aadfda14710acf8d14a0f1ba723` |
| Retrieval route | tarball |
| Files pulled | 150 |
| Bytes | 1121646 |
| Licence | CC BY 4.0 (documentation); Apache-2.0 (code) |

## Sections

Parsed **681** sections from 150 files, 114487 words. Anchors verified against the live site: **669**, unpublished pages: 12, unmatched: 0.

Dropped:

- `too_short`: 39
- `too_long`: 0
- `unmapped_domain`: 4
- `empty`: 84

## Corpus

**508 questions** in the shipped corpus, **636** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 103 | 100 | met |
| Network Policy | 18% | 98 | 90 | met |
| Service Mesh | 16% | 82 | 80 | met |
| Network Observability | 10% | 51 | 50 | met |
| Installation and Configuration | 10% | 54 | 50 | met |
| Cluster Mesh | 10% | 52 | 50 | met |
| eBPF | 10% | 26 | 25 | met |
| BGP and External Networking | 6% | 42 | 30 | met |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 89
- `component-roles` — 10 _(thin)_
- `ipam` — 3 _(thin)_
- `datapath-models` — 1 _(thin)_

**BGP and External Networking**

- `bgp-control-plane` — 13 _(thin)_
- `bgp-advertisement` — 11 _(thin)_
- `egress-gateway` — 9 _(thin)_
- `bgp-peering` — 7 _(thin)_
- `l2-announcements` — 1 _(thin)_
- `unmapped` — 1

**Cluster Mesh**

- `mesh-benefits` — 24 _(thin)_
- `global-services` — 19 _(thin)_
- `unmapped` — 5
- `mesh-setup` — 4 _(thin)_

**eBPF**

- `unmapped` — 12
- `ebpf-role` — 9 _(thin)_
- `bpf-maps` — 2 _(thin)_
- `ebpf-versus-iptables` — 2 _(thin)_
- `ebpf-program-model` — 1 _(thin)_

**Installation and Configuration**

- `unmapped` — 50
- `install` — 4 _(thin)_

**Network Policy**

- `unmapped` — 66
- `policy-rule-structure` — 17 _(thin)_
- `policy-intent` — 9 _(thin)_
- `policy-enforcement-modes` — 4 _(thin)_
- `identity-model` — 2 _(thin)_

**Network Observability**

- `hubble-capabilities` — 25
- `unmapped` — 10
- `metrics` — 6 _(thin)_
- `hubble-ui` — 5 _(thin)_
- `l7-visibility` — 5 _(thin)_

**Service Mesh**

- `unmapped` — 42
- `ingress` — 26
- `encryption` — 9 _(thin)_
- `gateway-api` — 5 _(thin)_

</details>

| Yield source | Count |
|---|---|
| scenario | 193 |
| attribute | 160 |
| definition | 99 |
| contrast | 56 |

Scenario share: **38.0%** (floor 25%).

## Difficulty

SystemOne scored **508** of 508 questions on a 1–5 scale where **3.0 is the real exam**. Median **3.47**.

| Band | Questions | What it is |
|---|---|---|
| 1.0–2.0 | 33 | Foundational recall |
| 2.0–2.5 | 60 | Easier than the exam |
| 2.5–3.5 | 166 | **The real exam band** |
| 3.5–4.5 | 244 | Harder than the exam |
| 4.5–5.0 | 5 | Expert / deep dive |

Difficulty is a calibration aid for the practice slider, not an official metric. The exam is associate-level; a corpus that skews above the middle band is a corpus that over-trains.

### Difficulty calibration

Difficulty is scored on a 1.0–5.0 scale by SystemOne as a calibration aid for the app slider (where 3.0 targets the real exam). It is a model judgement, not an official exam metric.

| Band | Questions | Share |
|---|---|---|
| 1.0-2.0 | 33 | 6.5% |
| 2.0-2.5 | 60 | 11.8% |
| 2.5-3.5 | 166 | 32.7% |
| 3.5-4.5 | 244 | 48.0% |
| 4.5-5.0 | 5 | 1.0% |

### Blueprint coverage

**463 of 508 questions (91.1%)** cite one of the 63 core CCA Study Guide / playlist files (60/60 eligible blueprint files represented).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| shape | 243 |
| entail | 217 |
| judge | 148 |
| quote | 17 |
| duplicate | 11 |

Judge histogram:

| Category | Count |
|---|---|
| good_exam_item | 908 |
| distractors_too_obvious | 35 |
| wording_broken | 65 |
| answer_not_determinable | 88 |
| trivia_not_in_blueprint | 45 |
| ambiguity_two_correct | 3 |

## Known weak points

94 of 508 questions (18.5%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `120a682472e1f14f` — architecture — An engineer wants to prevent Cilium from creating the NodePort and ClusterIP services that
- `1dec2cd57797436e` — architecture — A Cilium operator is creating an ENI. Which two API calls does it use to create and attach
- `1e5f88cebfe1d967` — architecture — Which Helm values are required to enable per-service DSR with IPIP dispatch using the serv
- `26e2a083f26b9dc8` — architecture — Which API calls does the operator use to create and attach a new ENI to the EC2 instance?
- `38bc3e392853bd15` — architecture — A team wants the CIDR list in loadBalancerSourceRanges to block traffic from certain CIDRs
- `47fa56912f3b7898` — architecture — An engineer wants pods in namespace `empire` to draw IPv4 addresses from one pool and IPv6
- `69bcbede817a9fa8` — architecture — An engineer runs `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | g
- `7332745f242d3aee` — architecture — Which Helm values are required to opt into DSR IPIP on a per-service basis through the ser
- `75e68b0712e0699e` — architecture — An engineer is initialising a Kubernetes control-plane node with kubeadm and wants to skip
- `98e7ecfeedc668ff` — architecture — A platform team runs Cilium on nodes whose devices are auto-detected, and Cilium selects m
- `a8f9fdaf1c27a561` — architecture — Which Helm value enables Kubernetes IPAM mode in Cilium?
- `b285c0049be314d2` — architecture — Which two packages does each node need installed in order to run NodePort XDP on AWS with 
- `ce69817643d13983` — architecture — A cluster administrator wants to change the kvstore endpoint and credentials that the cili
- `e8788ad23f7880b4` — architecture — An engineer needs to confirm which exact version of the Cilium docker container will run o
- `ff5b5f9d0af23ce7` — architecture — An engineer sets `ipam: kubernetes` in the Cilium ConfigMap with `enable-ipv4` set to `tru
- `4ddf34635483a44f` — bgp — Which advertisementType in a CiliumBGPAdvertisement is used to advertise IP addresses assi
- `a5d3bc3ed07b349c` — bgp — Which field is used to configure multiple gateway nodes within a single egress gateway pol
- `30554d9d2fa1e746` — cluster-mesh — An engineer is choosing how to expose the Cluster Mesh control plane. They want a stable L
- `5a185f1558acd7ed` — cluster-mesh — An engineer has a Global Headless Service in a Cluster Mesh and wants to stop Cilium from 
- `649e3abc66890da6` — cluster-mesh — Which of the following is listed as an option for configuring TLS certificates automatical
- `6c6b6b807e522ac3` — cluster-mesh — An engineer wants a Global Service to keep serving its own cluster's endpoints while also 
- `7f47589d33a98ca1` — cluster-mesh — An engineer wants Cilium to handle TLS certificate generation for Cluster Mesh automatical
- `8651c3d468030793` — cluster-mesh — Which annotation, when added to an existing global service, stops that service from being 
- `cbb557411e154759` — cluster-mesh — An engineer inspects a clustermesh-apiserver pod and wants to know which container is resp
- `1926eda389a76d11` — ebpf — An engineer observes that a node is running out of capacity for its local endpoints. Accor
- `3fe78a0b6c28c9df` — ebpf — A network engineer is configuring Cilium to protect a node against Distributed Denial of S
- `a13d99c23b831278` — ebpf — Users report that connections to clusterIP services fail on a node. You suspect the BPF cg
- `b4c8498ad5c867ba` — ebpf — A platform team enables BPF masquerading on a cluster and wants to know which network devi
- `e205c09cc80b7860` — ebpf — Which setting must be enabled for Cilium to probe the kernel and possibly use jiffies?
- `e7c11bfef09be49b` — ebpf — A platform team wants Cilium to drop malicious or unexpected traffic as early as possible,
- `eb635bf16f46be11` — ebpf — An engineer runs `cilium status` inside a Cilium pod to check whether eBPF host-routing is
- `076afbd18cf167c4` — installation — Which special identity represents any network endpoint outside of the cluster?
- `2ed52143fcf4e04a` — installation — A `cilium install` on your cluster fails and some Cilium pods are not being deployed. Whic
- `3792ec4a3e932093` — installation — A new endpoint is created but some of the metadata needed to derive its security identity 
- `3c99f5675449a516` — installation — Which field do CiliumNetworkPolicies use to match on pod labels in order to identify the s
- `4081bb26c730699c` — installation — A pod is started with the label app=benchmark. Which label does its Cilium endpoint carry?
- `6f9eef697c738765` — installation — Which of the following is listed as a supported label source?
- `7f832c819f00c6ad` — installation — A pod was launched on a node before Cilium was installed, so Cilium does not manage it. Wh
- `8415e75fcfb3bb36` — installation — A script runs a Cilium CLI command and the command fails with an error. What does the Cili
- `a7f1efb023a24467` — installation — A pod is created with the label `foo: bar`. Which label does the Cilium endpoint associate
- `b01646bc9a317d06` — installation — Which special identity is given to the IPs used as the source address for connections comi
- `c8ac3ec715a1ff1b` — installation — Which labels are associated with the well-known identity for the cilium-operator deploymen
- `cc943d7477358a7a` — installation — You are working in a single terminal session and want Cilium CLI tab completion for subcom
- `d1fb071f02a116a8` — installation — You have applied a Cilium Network Policy named rule1 to your cluster and want to confirm t
- `deae08560cbd3382` — installation — An engineer wants to see the security identities that the local Cilium agent is managing. 
- `f575a95b2f44a7fd` — installation — A pod in the kube-system namespace is labelled k8s-app=kube-dns and eks.amazonaws.com/comp
- `222b03385efc6cd5` — network-policy — A Cluster Mesh deployment needs longer than usual to complete a key rotation across severa
- `5bb0de73e892fa59` — network-policy — An application team complains that requests to forbidden destinations hang for a long time
- `7004d2c4c0b90b1e` — network-policy — A team wants to allow traffic to a set of pods from 10.0.0.0/8, but must exclude the subne
- `80de9b324b0d6507` — network-policy — You need to allow egress from selected endpoints to a set of destination CIDRs, but must c
- `85578d06bbe93055` — network-policy — Which entity should be used in a CiliumNetworkPolicy to allow traffic from the Cilium Envo
- `96ce5b6d77b8aea9` — network-policy — An engineer wants Cilium to permit all traffic from any source on ingress and to any desti
- `a6a0006dbecaf4d7` — network-policy — An engineer is designing an egress policy for endpoints with label env=prod. They want to 
- `aa3bcbb23a132136` — network-policy — A platform team runs Cilium with WireGuard enabled on nodes that sit behind firewalls, and
- `b9c13aa961a3c531` — network-policy — Rather than listing destination CIDRs inline, you want a policy field that can reference p
- `cf98391de5e2f87d` — network-policy — Which entity includes all containers running in host networking mode on the local host?
- `ef5e2cb7624ef76c` — network-policy — Rather than listing CIDRs inline, a team maintains a reusable set of prefixes and wants a 
- `f61e48646919761e` — network-policy — Which field on a CiliumNetworkPolicy controls whether the policy switches selected endpoin
- `fddea97dd4ba2db2` — network-policy — An engineer is writing a CiliumNetworkPolicy for endpoints with label env=prod. They want 
- `06c6c235b70bce09` — observability — A colleague asks which command you should run to confirm that Hubble has been enabled and 
- `1391c49b8c903cb4` — observability — A user reports that `hubble observe` returns nothing. The engineer first wants to confirm 
- `1acd66e8fdb20035` — observability — A team wants to enable metrics for both the Cilium agent and the Cilium Operator, but not 
- `375d6fc93fd0f6c0` — observability — An engineer wants cluster-wide visibility into the network and security layer of a Kuberne
- `3d62053d42b63d50` — observability — Before following a guide on setting up Hubble, an engineer is unsure whether Cilium itself
- `4a4c9fa0c9a8b3a9` — observability — An engineer wants to inspect network flows and gain visibility into what is happening at t
- `4aac1579169e631a` — observability — An engineer wants to confirm that traffic between two pods is actually being protected by 
- `641f37166f96dda1` — observability — You run `cilium hubble ui` and the terminal shows `Forwarding from 0.0.0.0:12000 -> 8081`.
- `79a37ecd96fdb07d` — observability — You are about to inspect network flows with the Hubble CLI on a cluster where Cilium is al
- `9f0633da4abd960c` — observability — Which command does the guidance recommend to verify that you can communicate with the Hubb
- `bd1f2fb2a373b4a4` — observability — You want to confirm that Cilium and Hubble are correctly installed before enabling the Hub
- `cbfa28532b7a1cb6` — observability — An engineer runs `cilium status` and sees that Cilium and Hubble are up and running. Which
- `e0eb8cb3330727b1` — observability — An engineer is stuck while working through the flow-inspection guide and wants to ask a qu
- `e12a8aa4959b6d31` — observability — An engineer is checking which Cilium components are deployed as DaemonSets and which as De
- `eb3a47a647a246b9` — observability — A colleague cannot reach Grafana at http://localhost:3000 after starting the documented po
- `f210d10aa02a5510` — observability — An engineer runs `cilium status` to check whether the observability layer is healthy. Whic
- `fa7186f5b1517d28` — observability — An engineer runs a port-forward for the prometheus service in the cilium-monitoring namesp
- `fa80f1105b4a48af` — observability — An engineer is troubleshooting a request/response exchange and wants to isolate the server
- `0f5dd1d7041ac32b` — service-mesh — An engineer runs `kubectl get cep -l app=echo -o=jsonpath='{.items[0].status.identity.id}'
- `19572f369ba26a8e` — service-mesh — Which condition type indicates that all referenced secrets were found and have permission 
- `26de10fc6cf5877b` — service-mesh — An engineer wants to expose the Cilium ingress controller Envoy listener on the host netwo
- `3583c5ef10bd6797` — service-mesh — In a Cilium Gateway API RequestHeaderModifier filter, which keyword is used to delete head
- `3b52df1f06412e27` — service-mesh — An engineer has an older Ingress manifest that predates the `ingressClassName` field and w
- `47d1ca85a8c1636b` — service-mesh — In a RequestHeaderModifier filter, which action is used to change the value of an existing
- `5bacf65cef4c970b` — service-mesh — Which field is used to specify the IP address of a Cilium Gateway?
- `5c5b21836387ddad` — service-mesh — You apply the following Service manifest to prepare the backend for TLS. A client connects
- `63ae3ee80e96423c` — service-mesh — An engineer is exposing Cilium's Envoy DaemonSet through a Loadbalancer Service in a clust
- `79e10ff71ede72be` — service-mesh — You are checking an HTTPRoute and want to confirm that the services it references were fou
- `7e3e7d5c8d560787` — service-mesh — A colleague has retrieved the Cilium Identity for the echo Pod and now wants to check that
- `b296ac43f1cad550` — service-mesh — You want to reach the demo applications by host name through the Gateway. Which host names
- `b44e7c47c5a088dd` — service-mesh — An engineer wants to pin a Cilium Gateway to a specific IP address using the Gateway API's
- `e327a506cc528fe9` — service-mesh — Which component's configuration flag is `ingress-lb-annotation-prefixes`, which governs th
- `e32948a7b455801d` — service-mesh — A Cilium Gateway API HTTPRoute includes a RequestHeaderModifier filter with the configurat
- `f836bf2a44070bc0` — service-mesh — An engineer enables the Cilium ingress controller in host network mode and does not set in
- `fe3303dc8df83522` — service-mesh — Which keyword is used in a RequestHeaderModifier filter to delete one or more headers from

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
