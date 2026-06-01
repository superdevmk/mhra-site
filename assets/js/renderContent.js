function normalizeLinkHref(href) {
  const raw = (href || "").trim();
  if (!raw) return "";
  if (/^(https?:|mailto:|tel:|#|\/|\.\.?\/)/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return "https://" + raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(raw)) return "https://" + raw;
  return raw;
}

function linkifyPlainText(text) {
  const urlRe = /(\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b)/gi;
  const escaped = escapeHtml(text || "");
  return escaped
    .replace(urlRe, (match) => {
      const isEmail = match.includes("@") && !match.startsWith("http");
      const href = isEmail ? "mailto:" + match : normalizeLinkHref(match);
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match)}</a>`;
    })
    .replace(/\n/g, "<br>");
}

function linkifyHtmlDom(root) {
  if (!root) return;
  const urlRe = /(\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b)/gi;
  const skipParent = (el) =>
    el && el.closest && el.closest("a, button, script, style, iframe, pre, code");

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    if (skipParent(node.parentElement)) return;
    const text = node.textContent || "";
    if (!urlRe.test(text)) return;
    urlRe.lastIndex = 0;

    const parts = text.split(urlRe);
    if (parts.length < 3) return;

    const frag = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 1) {
        const isEmail = part.includes("@") && !part.startsWith("http");
        const a = document.createElement("a");
        a.href = isEmail ? "mailto:" + part : normalizeLinkHref(part);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = part;
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
}

function looksLikeHtml(str) {
  return /<\s*(p|a|br|div|ul|ol|li|h[1-6]|img|iframe|blockquote|strong|em|span)\b/i.test(str || "");
}

function sanitizeRichHtml(raw) {
  if (!window.DOMPurify) {
    return linkifyPlainText(raw || "");
  }

  const clean = DOMPurify.sanitize(raw || "", {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "target",
      "rel",
      "href",
      "src",
      "alt",
      "title",
      "class",
      "frameborder",
      "allowfullscreen",
      "allow",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  const wrap = document.createElement("div");
  wrap.innerHTML = clean;

  wrap.querySelectorAll("a[href]").forEach((a) => {
    const href = normalizeLinkHref(a.getAttribute("href"));
    if (href) a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    a.classList.add("content-link");
  });

  linkifyHtmlDom(wrap);
  return wrap.innerHTML;
}

function renderBodyHtml(body, bodyFormat) {
  const raw = body || "";
  let fmt = bodyFormat || "plain";

  if (fmt === "plain" && looksLikeHtml(raw)) {
    fmt = "html";
  }

  if (fmt === "html") {
    return sanitizeRichHtml(raw);
  }

  if (fmt === "markdown" && window.marked && typeof window.marked.parse === "function") {
    return sanitizeRichHtml(window.marked.parse(raw));
  }

  return linkifyPlainText(raw);
}

function bodyPlainPreview(body, bodyFormat, maxLen) {
  const limit = maxLen || 200;
  const fmt =
    bodyFormat === "plain" && looksLikeHtml(body) ? "html" : bodyFormat || "plain";

  if (fmt === "html" || fmt === "markdown") {
    const tmp = document.createElement("div");
    tmp.innerHTML = renderBodyHtml(body, fmt);
    const text = tmp.textContent || "";
    return text.length > limit ? text.slice(0, limit) + "…" : text;
  }
  const text = body || "";
  return text.length > limit ? text.slice(0, limit) + "…" : text;
}
