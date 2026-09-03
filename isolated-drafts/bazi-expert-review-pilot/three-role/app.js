import { REVIEW_PREVIEW_MANIFEST, resolveViewId } from "./role-manifest.js";

const manifest = REVIEW_PREVIEW_MANIFEST;
const selectedViewId = resolveViewId(window.location.pathname, window.location.hash);
const selectedView = manifest.views[selectedViewId];

const requiredElements = {
  nav: document.querySelector("#role-nav"),
  content: document.querySelector("#view-content"),
  statusStrip: document.querySelector("#machine-status"),
  machineFooter: document.querySelector("#machine-footer"),
  lifecycle: document.querySelector("#status-lifecycle"),
  admission: document.querySelector("#status-admission"),
  binding: document.querySelector("#status-binding"),
  experts: document.querySelector("#status-experts"),
  authorization: document.querySelector("#status-authorization")
};

if (Object.values(requiredElements).some((element) => !(element instanceof HTMLElement))) {
  throw new Error("DTT three-role preview identity invalid");
}

function node(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.id) element.id = options.id;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    element.setAttribute(name, String(value));
  }
  for (const child of children) {
    element.append(child);
  }
  return element;
}

function navHref(view) {
  return window.location.protocol === "file:"
    ? `./index.html#${view.id}`
    : view.path;
}

function renderNavigation() {
  const fragment = document.createDocumentFragment();
  for (const viewId of manifest.viewOrder) {
    const view = manifest.views[viewId];
    const link = node("a", {
      className: viewId === selectedViewId ? "role-link role-link--current" : "role-link",
      text: view.navLabel,
      attributes: { href: navHref(view) }
    });
    if (viewId === selectedViewId) link.setAttribute("aria-current", "page");
    fragment.append(link);
  }
  requiredElements.nav.replaceChildren(fragment);
}

function renderStatus() {
  requiredElements.lifecycle.textContent = manifest.lifecycle;
  requiredElements.admission.textContent = manifest.admissionState;
  requiredElements.binding.textContent = manifest.bindingGate.label;
  requiredElements.experts.textContent = manifest.expertGate.label;
  requiredElements.authorization.textContent = String(manifest.authorization);
  const hideCoordinatorMachineState = selectedView.roleId === "domain-review";
  requiredElements.statusStrip.hidden = hideCoordinatorMachineState;
  requiredElements.machineFooter.hidden = hideCoordinatorMachineState;
}

function section(heading, body, className = "section-block") {
  return node("section", { className }, [
    node("h2", { text: heading }),
    body
  ]);
}

function renderList(items, className = "plain-list") {
  return node("ul", { className }, items.map((item) => node("li", { text: item })));
}

function renderFacts(facts) {
  return node("dl", { className: "fact-ledger" }, facts.map((fact) => {
    const value = node("dd", {
      className: fact.mono ? "mono" : "",
      text: fact.value
    });
    return node("div", { className: "fact-row" }, [
      node("dt", { text: fact.label }),
      value
    ]);
  }));
}

function renderLinks(links) {
  return node("ul", { className: "link-list" }, links.map((link) => {
    const anchor = node("a", {
      text: link.label,
      attributes: {
        href: link.href,
        target: "_blank",
        rel: "noopener noreferrer",
        referrerpolicy: "no-referrer"
      }
    });
    return node("li", {}, [
      anchor,
      node("span", { text: `点击将离开本地页面并联网 · ${link.note}` })
    ]);
  }));
}

function renderCollation(items) {
  return node("div", { className: "collation-list" }, items.map((item) => node("article", { className: "collation-row" }, [
    node("div", {}, [
      node("h3", { text: item.label }),
      node("p", { text: item.result })
    ]),
    renderFacts([
      { label: "anchor ID", value: item.anchorId, mono: true },
      { label: "page ref", value: item.pageRefId, mono: true },
      { label: "校勘候选", value: item.collationCandidateId, mono: true },
      { label: "载体 bytes / MIME", value: `${item.carrierBytes} / ${item.carrierMime}`, mono: true },
      { label: "载体 SHA-256", value: item.carrierSha256, mono: true },
      { label: "校勘候选摘要", value: item.collationDigest, mono: true },
      { label: "逐字同一", value: String(item.exactGlyphSequenceEqual), mono: true },
      { label: "真人校勘证明", value: String(item.humanCollatorAttestationCount), mono: true }
    ])
  ])));
}

function renderMachinePacketBasis() {
  const basis = manifest.machinePacketBasis;
  return section("协调员机器 packet basis（浏览器仅静态投影）", node("div", {}, [
    node("p", {
      className: "machine-basis-note",
      text: "这些值来自固定清单。浏览器不会读取或验证仓库 packet，不取得 runtime private brand，也不证明跨文件原子快照。"
    }),
    renderFacts([
      { label: "packet path", value: basis.path, mono: true },
      { label: "packet ID", value: basis.packetId, mono: true },
      { label: "packet digest", value: basis.packetDigest, mono: true },
      { label: "raw bytes", value: basis.rawBytes, mono: true },
      { label: "raw SHA-256", value: basis.rawSha256, mono: true },
      { label: "runtime private brand", value: String(basis.runtimePrivateBrandEstablished), mono: true },
      { label: "跨文件原子快照", value: String(basis.crossFileAtomicSnapshot), mono: true }
    ])
  ]), "section-block section-block--machine");
}

function renderView() {
  document.title = `${selectedView.navLabel} · ${manifest.title}`;
  document.body.dataset.view = selectedViewId;
  document.body.dataset.lifecycle = manifest.lifecycle;
  document.body.dataset.admission = manifest.admissionState;
  document.body.dataset.authorization = String(manifest.authorization);
  document.body.dataset.roleAccessControlEstablished = String(manifest.templateBoundary.roleAccessControlEstablished);
  document.body.dataset.physicalSeatSeparationEstablished = String(manifest.templateBoundary.physicalSeatSeparationEstablished);

  const roleHeader = node("header", { className: "view-header" }, [
    node("p", { className: "view-position", text: `当前模板 · ${selectedView.navLabel}` }),
    node("h2", { text: selectedView.title }),
    node("p", { className: "view-summary", text: selectedView.summary }),
    node("p", { className: "phase-note", text: selectedView.phaseNote })
  ]);

  const scopeGrid = node("div", { className: "scope-grid" }, [
    section("本角色只做什么", renderList(selectedView.scope, "check-list"), "scope-panel scope-panel--yes"),
    section("本角色明确不做什么", renderList(selectedView.exclusions, "stop-list"), "scope-panel scope-panel--no")
  ]);

  const content = [
    roleHeader,
    node("aside", { className: "template-access-boundary", attributes: { role: "note" } }, [
      node("strong", { text: "四路导航不是访问控制。" }),
      node("p", { text: "同一人可浏览全部模板；当前意见记录为 0，所以没有跨模板意见内容可泄露。未来正式 A／B 必须使用独立物理包或独立会话。" })
    ]),
    scopeGrid,
    section(selectedView.roleId === "domain-review" ? "审阅题面与当前材料" : "当前可见的公开元数据", renderFacts(selectedView.facts))
  ];

  if (selectedView.links.length > 0) {
    content.push(section("公开链接（点击将联网）", renderLinks(selectedView.links)));
  }

  if (selectedView.collation) {
    content.push(section("两个扫描锚点的候选观察", renderCollation(selectedView.collation)));
  }

  if (selectedView.showMachinePacketBasis) {
    content.push(renderMachinePacketBasis());
  }

  content.push(section("缺少这些材料，所以现在不能完成审定", renderList(selectedView.missing, "missing-list"), "section-block section-block--missing"));
  content.push(node("aside", { className: "final-boundary", attributes: { role: "note" } }, [
    node("strong", { text: "停在这里是正确结果。" }),
    node("p", {
      text: selectedView.roleId === "domain-review"
        ? "本页不会要求填写意见，也不会把浏览行为当作已审阅、已同意、已形成专家意见或已获授权。这个领域模板没有外链，应用本身也不主动联网。"
        : "本页不会要求填写意见，也不会把浏览行为计为审阅、同意、真实人员席位、Binding 冻结或授权。应用本身不主动 fetch；只有点击公开外链才会离开本地页面并联网。"
    })
  ]));

  requiredElements.content.replaceChildren(...content);
}

renderNavigation();
renderStatus();
renderView();
