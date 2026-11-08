# Corpus report

Generated 2026-11-08T00:34:14.718Z

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

**54 questions** in the shipped corpus, **14** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 23 | 100 | **short** |
| Network Policy | 18% | 11 | 90 | **short** |
| Service Mesh | 16% | 6 | 80 | **short** |
| Network Observability | 10% | 3 | 50 | **short** |
| Installation and Configuration | 10% | 7 | 50 | **short** |
| Cluster Mesh | 10% | 4 | 50 | **short** |
| eBPF | 10% | 0 | 50 | **short** |
| BGP and External Networking | 6% | 0 | 30 | **short** |

| Yield source | Count |
|---|---|
| definition | 49 |
| attribute | 3 |
| scenario | 2 |

Scenario share: **3.7%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| duplicate | 10 |
| quote | 4 |

## Known weak points

54 of 54 questions (100.0%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `0f138c18557ce81d` — architecture — Which statement best describes Kubernetes CRDs (Default) in Cilium?
- `147e680e5a65b8fc` — architecture — An engineer wants to use a pool name other than `default` for the migration from cluster-p
- `18947b8895c26f8b` — architecture — Which statement best describes Load-balancing in Cilium?
- `1edf065165b76bf0` — architecture — During the migration process, after updating the CiliumPodIPPool to the new CIDR and resta
- `27bc2b63fecf59ee` — architecture — Which statement best describes Key-Value Store in Cilium?
- `394736af8657ab6e` — architecture — Why is it not possible to directly delete or update the CIDRs already in use within an exi
- `3b6a5f700bd1887a` — architecture — Which statement best describes Setting the masquerading interface in Cilium?
- `3bb2c674e502ebe3` — architecture — Which statement best describes Addressing in Cilium?
- `577abc361d6b43e9` — architecture — Which statement best describes Masquerading in Cilium?
- `653ac7121a014a09` — architecture — Which statement best describes IPs in Cilium?
- `786dd43b09ad1ea5` — architecture — An engineer is configuring a new Cilium cluster and wants to ensure that TCP workloads are
- `83bee3681df01869` — architecture — Which statement best describes Debug Client (CLI) in Cilium?
- `8b579c5bef5c7cb7` — architecture — Which statement best describes CNI Plugin in Cilium?
- `96aba39cf8cc3a75` — architecture — An engineer is configuring the bandwidth manager for a multi-node cluster. They need to ma
- `9b05f33ad6749f3e` — architecture — Which statement best describes Graphical UI (GUI) in Cilium?
- `9b9262adf6663930` — architecture — Which statement best describes Weights in Cilium?
- `be54bab782346128` — architecture — Which statement best describes shell-session in Cilium?
- `be54bab782346128` — architecture — An engineer is migrating a cluster from the 10.10.0.0/16 CIDR to 10.20.0.0/16. After updat
- `c043a320c68f9311` — architecture — Which statement best describes CiliumEndpointSlice in Cilium?
- `c570bf31acfd7927` — architecture — Which statement best describes Subscription (optional) in Cilium?
- `c5928bdb4818f728` — architecture — Which statement best describes VNet / subnet resource group in Cilium?
- `f37b3b7757719126` — architecture — A cluster administrator is troubleshooting latency issues in a Cilium cluster where the ba
- `fdae965890409a35` — architecture — Which statement best describes Status in Cilium?
- `528d7149d7b6dbf5` — cluster-mesh — Which statement best describes ClusterIP in Cilium?
- `cfa0685b991591c6` — cluster-mesh — Which statement best describes MCS-API in Cilium?
- `fcf9ce7ff2f37bf7` — cluster-mesh — Which statement best describes NodePort in Cilium?
- `fd91e0f7cc84b0a8` — cluster-mesh — Which statement best describes LoadBalancer in Cilium?
- `1c0ec6d6bedc6ab3` — installation — Which statement best describes KVStore in Cilium?
- `254aa3d5fafeae6b` — installation — Which statement best describes Throughput in Cilium?
- `3119b39fcb48f8b9` — installation — Which statement best describes Connections Rate in Cilium?
- `38cdb07d7904eced` — installation — Which statement best describes Identities in Cilium?
- `4e55f6ae8ade72e3` — installation — Which statement best describes Request/Response Rate in Cilium?
- `d735e63113f452b6` — installation — Which statement best describes Below in Cilium?
- `e5330ee82a844d11` — installation — Which statement best describes Upgrades in Cilium?
- `10fe40605ba8ab82` — network-policy — Which statement best describes Headers in Cilium?
- `11c4e64a679246dd` — network-policy — Which statement best describes labels in Cilium?
- `302f4e6633b513d3` — network-policy — Which statement best describes egress in Cilium?
- `476080ae2c8545c9` — network-policy — Which statement best describes ingress in Cilium?
- `6cbb37b38744525a` — network-policy — Which statement best describes endpointSelector / nodeSelector in Cilium?
- `8442054483370b1c` — network-policy — Which statement best describes Packets in Cilium?
- `8515061745b44ef2` — network-policy — Which statement best describes always in Cilium?
- `872ac8aab516af9f` — network-policy — Which statement best describes host in Cilium?
- `947045d0b1b99d98` — network-policy — Which statement best describes never in Cilium?
- `e9fa1722c8225547` — network-policy — Which statement best describes Path in Cilium?
- `f46c6e3be3792535` — network-policy — Which statement best describes XfrmInStateProtoError There in Cilium?
- `38e5dfb0594b80de` — observability — Which statement best describes Hubble Relay in Cilium?
- `4a2c9088a1b126d7` — observability — Which statement best describes Cilium Operator Feature Metrics in Cilium?
- `ce142e7ce920fba3` — observability — Which statement best describes Events in Cilium?
- `4e6a9145714dab90` — service-mesh — Which statement best describes Application Developers in Cilium?
- `89ab4066a87c867e` — service-mesh — Which statement best describes Cluster Operators in Cilium?
- `9b05a5d516134467` — service-mesh — Which statement best describes Once CRDs in Cilium?
- `a283fb080e2f6e34` — service-mesh — Which statement best describes Listeners in Cilium?
- `b7886d4a75fd3c0c` — service-mesh — Which statement best describes Conditions in Cilium?
- `fa3122fe9a403e17` — service-mesh — Which statement best describes Here in Cilium?

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
