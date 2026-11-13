# Free courses and resources

Every link here was checked on **2026-11-13**: the HTTP status, the title, the
channel, and the duration where it matters. Where something turned out not to be
free, that is said rather than left implied.

The exam is eight domains. The most efficient free path is not a single course —
it is the three **Cilium Week** sessions for coverage, the **Isovalent labs** for
hands-on, and this app for recall.

---

## Start here: the three Cilium Week sessions

Four hours total, and between them they walk the whole blueprint. Delivered by
Solo.io and Isovalent when the CCA launched.

| # | Session | Length | Covers |
|---|---|---|---|
| 1 | [Architecture and Installation](https://www.youtube.com/watch?v=9Gj_9zpsnL0) | 71 min | Architecture 20%, Installation 10% |
| 2 | [Network policy and observability](https://www.youtube.com/watch?v=lGHTSpBLWVc) | 78 min | Network Policy 18%, Observability 10% |
| 3 | [BGP, Service mesh & Cluster mesh](https://www.youtube.com/watch?v=eNx2wqSB7rY) | 97 min | Service Mesh 16%, Cluster Mesh 10%, BGP 6% |

That is 38 of the exam's 100 weight points in a single afternoon. eBPF (10%) is
the gap, and the Isovalent study guide covers it with reading and a lab.

Verified: all three return 200; durations are the video `lengthSeconds`.

---

## The Isovalent CCA playlist

[**Cilium Certifications**](https://www.youtube.com/playlist?list=PLngi_1qThAPB4yfZ-yaJO9WF7PUBcrfga)
— 35 videos, curated by the company founded by Cilium's creators, and explicitly
for this certification.

It is not a course; it is a set of focused demos that map onto the domains:

- **Architecture** — What is Cilium, Cilium Technical Deep Dive: Under the Hood,
  Cilium's Evolution: The Founding Story
- **Network Policy** — L7 Flow Visibility, Cilium Network Policies
- **Service Mesh** — Gateway API minis (traffic splitting, header modifier,
  cross-namespace routing, TLS termination, TLS passthrough), Mutual
  Authentication, Envoy as a DaemonSet
- **Observability** — Hubble UI, Hubble CLI Walkthrough, L7 Flow Visibility
- **Cluster Mesh** — Cluster Mesh, Cluster Mesh Service Affinity
- **eBPF** — Back to Basics series
- **BGP** — BGP with Cilium, LB IPAM, BGP Service Advertisement, Graceful
  Restart, eBGP Multihop, Custom BGP Timers

Worth watching the ones that match whichever domain you scored worst on in the
app's exam simulation.

---

## Hands-on: Isovalent labs (free, no install)

<https://isovalent.com/labs/> — the exam's creator names these as his top
recommendation. Browser-based, so no cluster to build.

Verified working on 2026-11-13:

| Lab | Domain |
|---|---|
| [Getting Started with Cilium](https://isovalent.com/labs/cilium-getting-started/) | Architecture, Installation |
| [Cilium IPAM](https://isovalent.com/labs/cilium-ipam/) | Architecture, IPAM |
| [Isovalent Enterprise: Network Policies](https://isovalent.com/labs/cilium-network-policies/) | Network Policy |
| [Cilium Ingress Controller](https://isovalent.com/labs/cilium-ingress-controller/) | Service Mesh |
| [Cilium Gateway API](https://isovalent.com/labs/cilium-gateway-api/) | Service Mesh |
| [Advanced Gateway API Use Cases](https://isovalent.com/labs/cilium-gateway-api-advanced/) | Service Mesh |
| [Cilium Transparent Encryption with IPSec and WireGuard](https://isovalent.com/labs/cilium-transparent-encryption-with-ipsec-and-wireguard/) | Service Mesh |
| [Cilium IPv6 Networking and Observability](https://isovalent.com/labs/cilium-ipv6/) | Observability |
| [Golden Signals with Hubble and Grafana](https://isovalent.com/labs/hubble-grafana-golden-signals/) | Observability |
| [Cilium Cluster Mesh](https://isovalent.com/labs/cilium-cluster-mesh/) | Cluster Mesh |
| [Getting started with eBPF](https://isovalent.com/labs/ebpf-getting-started/) | eBPF |
| [eBPF Networking](https://isovalent.com/labs/ebpf-networking/) | eBPF |
| [BGP on Cilium](https://isovalent.com/labs/cilium-bgp/) | BGP |
| [Cilium LoadBalancer IPAM and BGP Service Advertisement](https://isovalent.com/labs/cilium-lb-ipam-bgp/) | BGP |
| [Advanced BGP Features](https://isovalent.com/labs/cilium-bgp-advanced/) | BGP |
| [Cilium Egress Gateway](https://isovalent.com/labs/cilium-egress-gateway/) | BGP, egress |
| [Cilium LoadBalancer IPAM and L2 Service Announcement](https://isovalent.com/labs/cilium-lb-ipam-l2-announcements/) | BGP |

A mutual-authentication lab is listed in the study guide but its URL now 404s —
the lab appears to have been retired.

---

## The study guide, mapped to the domains

[**isovalent/CCA-Study-Guide**](https://github.com/isovalent/CCA-Study-Guide) —
CC BY-NC 4.0. The exam's creator calls it "a really good start".

It is a per-domain resource list rather than a course. Its value is that it is
organised the way the exam is, so you can work one domain at a time. It is
**not** ingested into this corpus, because its licence forbids commercial
redistribution while the Cilium docs do not.

---

## Reading that is free and official

- [Cilium documentation](https://docs.cilium.io/en/stable/) — the primary
  reference for the exam, and the source this app's corpus is generated from.
- [Linux Foundation CCA exam page](https://training.linuxfoundation.org/certification/cilium-certified-associate-cca/)
  — the official blueprint: eight domains at 20/18/16/10/10/10/10/6. The CNCF
  curriculum repository's CCA PDF has been removed; its README still lists a
  stale five-domain draft that predates the published blueprint.
- [KubeDojo CCA path](https://kube-dojo.github.io/k8s/cca/) — free, maps the
  domains to modules. Its stated pass mark of 66% is **wrong**; the published
  mark is 75%.

---

## Not free, despite appearances

| Resource | Reality |
|---|---|
| [KodeKloud CCA prep course](https://kodekloud.com/courses/cilium-certified-associate-cca) | "Enrol for Free" is an account signup; the course itself is Pro-only. There is a free trial. |
| Udemy CCA courses | Several exist. Udemy discounts them to near-zero regularly, but the list price is not free and the question banks are unverified. |
| LinuxFoundationX "Introduction to Cilium" on edX | Linked from the study guide, but the edX URL now redirects to a generic Kubernetes catalogue page. Treat as unavailable until you find a live listing. |

---

## A plan for nine days

Assumes roughly two hours a day, and uses the app for the part that reading
cannot do.

| Day | Do | Why |
|---|---|---|
| 1 | Watch Cilium Week session 1 (71 min) | Architecture is 20% and everything else assumes it |
| 2 | Take the **blind evaluation** in the app as a baseline | This is the only score that measures you rather than the generator |
| 3 | Watch session 2 (78 min), then practice Network Policy in the app | 18% and the most commonly failed domain |
| 4 | Labs: Getting Started, Network Policies | Reading policy syntax is not the same as writing it |
| 5 | Watch session 3 (97 min), then practice Service Mesh and Cluster Mesh | 26% between them |
| 6 | Labs: Gateway API, Cluster Mesh, eBPF | The three you are least likely to have touched |
| 7 | Practice eBPF and BGP in the app; read the BGP labs | The two smallest domains, easiest to neglect |
| 8 | Full 60-question exam simulation, then review every wrong answer and its citation | Timing matters: 90 minutes is tight |
| 9 | Retake the blind evaluation; re-read only the domains still under 75% | No new material the day before |

The app's **Review** tab lists every question the pipeline rejected, with the
reason. Skimming it is a fast way to see the distinctions the exam cares about —
for example which questions were rejected for being unanswerable rather than
wrong.
