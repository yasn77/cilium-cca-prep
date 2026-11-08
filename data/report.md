# Corpus report

Generated 2026-11-08T03:40:03.984Z

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

**567 questions** in the shipped corpus, **116** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 103 | 100 | met |
| Network Policy | 18% | 92 | 90 | met |
| Service Mesh | 16% | 109 | 80 | met |
| Network Observability | 10% | 65 | 50 | met |
| Installation and Configuration | 10% | 56 | 50 | met |
| Cluster Mesh | 10% | 51 | 50 | met |
| eBPF | 10% | 56 | 25 | met |
| BGP and External Networking | 6% | 35 | 30 | met |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 86
- `component-roles` — 13 _(thin)_
- `datapath-models` — 3 _(thin)_
- `ipam` — 1 _(thin)_

**BGP and External Networking**

- `egress-gateway` — 15 _(thin)_
- `bgp-advertisement` — 11 _(thin)_
- `bgp-peering` — 6 _(thin)_
- `bgp-control-plane` — 3 _(thin)_

**Cluster Mesh**

- `global-services` — 15 _(thin)_
- `unmapped` — 14
- `mesh-setup` — 11 _(thin)_
- `mesh-benefits` — 11 _(thin)_

**eBPF**

- `ebpf-role` — 26
- `bpf-maps` — 16 _(thin)_
- `unmapped` — 8
- `ebpf-program-model` — 6 _(thin)_

**Installation and Configuration**

- `unmapped` — 45
- `connectivity-test` — 5 _(thin)_
- `upgrade` — 5 _(thin)_
- `status-monitoring` — 1 _(thin)_

**Network Policy**

- `unmapped` — 64
- `policy-intent` — 14 _(thin)_
- `policy-rule-structure` — 12 _(thin)_
- `policy-enforcement-modes` — 2 _(thin)_

**Network Observability**

- `hubble-capabilities` — 45
- `hubble-cli` — 10 _(thin)_
- `unmapped` — 5
- `l7-visibility` — 3 _(thin)_
- `metrics` — 2 _(thin)_

**Service Mesh**

- `unmapped` — 64
- `ingress` — 19 _(thin)_
- `encryption` — 13 _(thin)_
- `gateway-api` — 9 _(thin)_
- `sidecar-versus-sidecarless` — 4 _(thin)_

</details>

| Yield source | Count |
|---|---|
| scenario | 224 |
| attribute | 144 |
| definition | 110 |
| contrast | 89 |

Scenario share: **39.5%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| entail | 99 |
| quote | 11 |
| duplicate | 6 |

## Known weak points

567 of 567 questions (100.0%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `00777ac876a5437a` — architecture — Which statement best describes the default behaviour of Cilium's eBPF NodePort implementat
- `00d8fef3ead89cfe` — architecture — A platform team runs Cilium natively, without CNI chaining, and wants to enforce the `kube
- `016ba4f68ec584ba` — architecture — You have deployed a node-local DNS cache as a normal pod and applied a Local Redirect Poli
- `02a1e57c376f7b31` — architecture — Which command does the excerpt present for verifying whether the bandwidth manager with BB
- `02c14556b8068d9c` — architecture — In a `cilium-dbg monitor` trace, you see several events sharing the same `sock_cookie` val
- `03426fa3cd206abc` — architecture — An engineer runs Cilium's eBPF kube-proxy replacement with socket-LB enabled. A pod has an
- `03fb30cbef4d3130` — architecture — An engineer wants to inspect the state and status of the Cilium agent on the node they are
- `0e45850b7aad078c` — architecture — A cluster administrator is troubleshooting why Maglev consistent hashing is not being appl
- `0f138c18557ce81d` — architecture — Which statement best describes Kubernetes CRDs in Cilium?
- `111af0cbc3a4c706` — architecture — An engineer is configuring Maglev for a service that may scale to around 500 backends. The
- `12431a624869bfe2` — architecture — Which statement about the range of workloads eBPF can handle is supported by the excerpt?
- `1341abd1960e91d0` — architecture — A pod is configured with a `hostPort` that overlaps with the configured NodePort range, on
- `147e680e5a65b8fc` — architecture — An engineer wants to use a pool name other than `default` for the migration from cluster-p
- `18947b8895c26f8b` — architecture — Which statement best describes Load-balancing in Cilium?
- `1edf065165b76bf0` — architecture — During the migration process, after updating the CiliumPodIPPool to the new CIDR and resta
- `20a6e7267f8aa86a` — architecture — You are asked to file a GitHub issue about a socket load-balancing setup failure and need 
- `249ff602e37252bd` — architecture — An on-premises operator wants to combine Cilium's XDP acceleration with a LoadBalancer ser
- `25e5fa5a37577f6c` — architecture — A cluster's kube-apiserver has been configured to use the NodePort range 10000-32767 inste
- `26e2a083f26b9dc8` — architecture — A new ENI is being created for an instance whose existing ENIs occupy interface indexes 1,
- `27bc2b63fecf59ee` — architecture — Which statement best describes Key-Value Store in Cilium?
- `2d7a0babb735750d` — architecture — A platform team runs a cluster whose nodes are on Linux 5.15 and wants to enable BBR conge
- `394736af8657ab6e` — architecture — Why is it not possible to directly delete or update the CIDRs already in use within an exi
- `3bb2c674e502ebe3` — architecture — Which statement best describes Addressing in Cilium?
- `3c8abe3b04db0c42` — architecture — An engineer is comparing Maglev with the default loadBalancer.algorithm=random. Which stat
- `3de9bb4db18dbd30` — architecture — You are adapting the example Local Redirect Policy for a cluster whose DNS service and por
- `4a75c52f99089d9c` — architecture — Which statement about transport protocol support in Cilium's eBPF kube-proxy replacement m
- `4cff60044d125bf6` — architecture — An operator sets `spec.eni.security-groups` and also `spec.eni.security-group-tags` on the
- `5020ae9d037269db` — architecture — An engineer wants to find the correct route MTU value to configure inside a KataPod. Accor
- `577abc361d6b43e9` — architecture — Which statement best describes Masquerading in Cilium?
- `5a8c15b5594dc81c` — architecture — You want to trace socket LB related datapath events. According to the excerpt, which two t
- `5b07e7560f42654c` — architecture — A platform team runs Kata Pods on a Cilium cluster with VXLAN enabled. Users report packet
- `5c3dae2c87b49dd8` — architecture — Which statement best describes how Cilium treats the numeric values supplied through the s
- `600109b4a825a2dd` — architecture — You are enabling the DNS node-cache in a Cilium cluster. According to the excerpt, why mus
- `653ac7121a014a09` — architecture — Which statement best describes IPs in Cilium?
- `668115517a69aca7` — architecture — A platform team runs Cilium's eBPF NodePort implementation with the default settings. A cl
- `66b5399073c0ca33` — architecture — After creating the NodePort service, an engineer runs `iptables-save | grep KUBE-SVC` in t
- `67b0fd8df6413ede` — architecture — An engineer enables the bandwidth manager with BBR on a recent kernel but does not enable 
- `68584bff318b8e89` — architecture — Which statement correctly describes the default state of the `loadBalancer.acceleration` s
- `69bcbede817a9fa8` — architecture — An engineer runs `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | g
- `75762c1a02ba2155` — architecture — A platform team runs a selectorless Service backed by two manually managed EndpointSlice o
- `786dd43b09ad1ea5` — architecture — An engineer is configuring a new Cilium cluster and wants to ensure that TCP workloads are
- `7c4f09238e32497b` — architecture — A cluster runs with `multi-pool` as its IPAM mode. Its `default` CiliumPodIPPool lists the
- `7d5cf05d60bf896e` — architecture — A team is planning to change the maglev.tableSize on a running cluster. What temporary eff
- `7e070f815ec65ffd` — architecture — An engineer sets spec.loadBalancerSourceRanges on a LoadBalancer service and expects the s
- `7e95f130090f41c4` — architecture — A security architect wants to distinguish between different kinds of application traffic b
- `83bee3681df01869` — architecture — Which statement best describes Debug Client in Cilium?
- `863b600c170f5a98` — architecture — An operations team is concerned that adopting eBPF-based networking will require developer
- `8b579c5bef5c7cb7` — architecture — Which statement best describes CNI Plugin in Cilium?
- `8ddcf4430bc9ab0f` — architecture — An operator is tuning a Cilium deployment and wants to avoid the MTU reduction that DSR wo
- `8e47aefd95c13d7d` — architecture — Which API calls does the operator use to create and attach a new ENI to the EC2 instance?
- `90c99a74f69c3f66` — architecture — A team worries that identity-based security enforcement will not cope as their microservic
- `921688d575427a71` — architecture — An engineer is migrating a kind cluster from cluster-pool to multi-pool IPAM mode. They ex
- `92e46684d6f343ab` — architecture — A LoadBalancer service is created with no value set for spec.loadBalancerSourceRanges. Wha
- `95c6142a755dd29b` — architecture — An engineer has an existing `CiliumPodIPPool` named `default` that pods on the cluster are
- `96aba39cf8cc3a75` — architecture — An engineer is configuring the bandwidth manager for a multi-node cluster. They need to ma
- `98165ad5c899b7f8` — architecture — During troubleshooting you find that the local redirect service entry is missing, which th
- `98e7ecfeedc668ff` — architecture — A platform team runs Cilium on nodes whose devices are auto-detected, and Cilium selects m
- `9b05f33ad6749f3e` — architecture — Which statement best describes Graphical UI in Cilium?
- `9b1e0876c0e0c334` — architecture — Which curl targets does the excerpt use to demonstrate connectivity for the exposed NodePo
- `9b9262adf6663930` — architecture — Which statement best describes Weights in Cilium?
- `9c3ab4eb57ee1538` — architecture — You expose the `my-nginx` deployment as a NodePort service and want to confirm that Cilium
- `9d9cb495bf7c45c2` — architecture — Which statement correctly describes the default set of IP addresses through which a NodePo
- `a08b0e04b2bc08a3` — architecture — An engineer wants to prevent the creation of the corresponding NodePort and ClusterIP serv
- `a20d03b654e568a3` — architecture — Which statement best describes Subscription in Cilium?
- `a329f626c197ff46` — architecture — The Cilium Operator becomes temporarily unavailable in a cluster. According to the excerpt
- `a89b7fbb6c0ebe7f` — architecture — You have deployed Cilium following the Quick-Start guide and want a quick confirmation tha
- `a8b82f6a61f7809a` — architecture — An engineer is configuring a new Cilium cluster and wants to enable the bandwidth manager 
- `a9b3bf13407470e5` — architecture — A KataPod is created inside the VM that Kata runs in the outer Container Networking Namesp
- `ae9ba028108f4c3f` — architecture — In the verbose status output, which service types are shown as Enabled, and what NodePort 
- `b52ffd6ff289068d` — architecture — During the migration process, an engineer checks the status of a CiliumNode that has alrea
- `b8d0e8cf6b83f56e` — architecture — A platform team is enabling Maglev hashing for their Cilium load balancer. They want to av
- `bcfc05530a57f00c` — architecture — Your cluster uses the multi-pool IPAM mode. A single CiliumPodIPPool named default current
- `be54bab782346128` — architecture — An engineer is migrating a cluster from the 10.10.0.0/16 CIDR to 10.20.0.0/16. After updat
- `bee3a4a7d0d173ab` — architecture — An engineer assigns a weight annotation to an EndpointSlice that contributes four backend 
- `bf21240af76735e2` — architecture — Several subnets satisfy the VPC, Availability Zone and any configured ID or tag criteria. 
- `c043a320c68f9311` — architecture — Which statement best describes CiliumEndpointSlice in Cilium?
- `c18c3107f00a7ec6` — architecture — An application running in the host network namespace of a Cilium node attempts a bind(2) t
- `c1f5ed9ee20782ef` — architecture — A security team wants to block traffic from a specific set of CIDRs while allowing all oth
- `c2943830a6eca177` — architecture — An engineer runs `cilium-dbg status --verbose` on a cluster where kube-proxy replacement i
- `c57772e2cdd587c2` — architecture — Which service types does the excerpt say Cilium can accelerate at the XDP layer, and under
- `c7f52aeb081f891f` — architecture — An engineer enables XDP acceleration for NodePort handling and then tries to observe the p
- `cd5b0c25ebfad654` — architecture — How does the excerpt characterise the benefit of BBR for Internet-facing traffic, and what
- `ced1077f5829a715` — architecture — A colleague asks what happens to DNS queries from application pods in a Cilium cluster tha
- `d074ab928093036e` — architecture — Which statement best describes a benefit of Maglev consistent hashing as presented in the 
- `d61f69dc967f13fb` — architecture — You are migrating a kind cluster from cluster-pool IPAM to multi-pool IPAM. The Helm upgra
- `da9efd09dcce2572` — architecture — Why does the excerpt not recommend lowering the MTU value in the Cilium ConfigMap as a fix
- `dada3deb648f6653` — architecture — A cluster uses DSR mode. Because a given backend can serve multiple services, the backend 
- `db0471629ed6b8fe` — architecture — On a node, the configured NodePort range overlaps with the ephemeral port range net.ipv4.i
- `dd180d8442a08ef4` — architecture — According to the excerpt, why do older kernels fail to make BBR work reliably for Pods?
- `df8379b7fce1935c` — architecture — A Service is backed by two EndpointSlice objects with weights 70 and 30. Later, the operat
- `df900dc79cff2036` — architecture — An engineer wants to use a pool name other than `default` for the migration. According to 
- `dfebc99a96fb92fb` — architecture — A team deploys Cilium in DSR mode on AWS and finds that DSR does not work. According to th
- `e049125cc208db5c` — architecture — A platform team mounts NFS volumes to a `Service` cluster IP while using socket-LB, and th
- `e117f978ce313b10` — architecture — After all `node-local-dns` pods report ready, you want to confirm that DNS requests from a
- `e7b039f18b158c97` — architecture — During creation of the outer Container Networking Namespace, Cilium creates the eth0 inter
- `ed012c7b0e2d7569` — architecture — Neither `spec.eni.subnet-ids` nor `spec.eni.subnet-tags` is set. The operator first tries 
- `f2d8b8a7f3986df1` — architecture — What is the role of the Cilium agent (`cilium-agent`) on a node?
- `f37b3b7757719126` — architecture — A cluster administrator is troubleshooting latency issues in a Cilium cluster where the ba
- `f66478ec599bab8b` — architecture — During a rolling migration, some Cilium agents are running in multi-pool mode while others
- `fd5053427f877dbd` — architecture — An administrator sets nodePort.directRoutingDevice=eth+ on a cluster where several devices
- …and 467 more

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
