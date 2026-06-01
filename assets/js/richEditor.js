async function uploadEditorImage(file, bucket, folder) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder || session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function promptForUrl(label) {
  const url = window.prompt(label || "Enter URL (https://…)");
  if (!url) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
    return "https://" + trimmed;
  }
  return trimmed;
}

function toEmbedVideoUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function bindRichToolbarHandlers(quill) {
  const toolbar = quill.getModule("toolbar");
  if (!toolbar) return;

  toolbar.addHandler("link", (value) => {
    if (value) {
      quill.format("link", value);
      return;
    }
    const url = promptForUrl("Link URL");
    if (!url) return;
    const range = quill.getSelection(true);
    if (!range) return;
    if (range.length) {
      quill.format("link", url);
    } else {
      const text = window.prompt("Link text", url) || url;
      quill.insertText(range.index, text, { link: url }, Quill.sources.USER);
      quill.setSelection(range.index + text.length);
    }
  });

  toolbar.addHandler("image", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const url = await uploadEditorImage(file, quill.__uploadBucket, quill.__uploadFolder);
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, "image", url, Quill.sources.USER);
        quill.setSelection(range.index + 1);
      } catch (err) {
        alert(err.message || "Image upload failed");
      }
    };
    input.click();
  });

  toolbar.addHandler("video", () => {
    const url = promptForUrl("Video URL (YouTube or Vimeo)");
    if (!url) return;
    const embed = toEmbedVideoUrl(url) || url;
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, "video", embed, Quill.sources.USER);
    quill.setSelection(range.index + 1);
  });
}

function initRichEditor(containerId, options) {
  const opts = options || {};
  const bucket = opts.bucket || "content-media";
  const folder = opts.folder || null;
  const placeholder = opts.placeholder || "Write content…";
  const hiddenInput = opts.hiddenInput
    ? document.getElementById(opts.hiddenInput)
    : null;

  const container = document.getElementById(containerId);
  if (!container || !window.Quill) {
    console.warn("Rich editor container or Quill not found");
    return null;
  }

  const quill = new Quill(container, {
    theme: "snow",
    placeholder,
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link", "image", "video"],
        [{ indent: "-1" }, { indent: "+1" }],
        ["clean"],
      ],
    },
  });

  quill.__uploadBucket = bucket;
  quill.__uploadFolder = folder;
  bindRichToolbarHandlers(quill);

  if (hiddenInput && hiddenInput.value) {
    quill.root.innerHTML = hiddenInput.value;
  }

  quill.on("text-change", () => {
    if (hiddenInput) hiddenInput.value = quill.root.innerHTML;
    if (typeof opts.onChange === "function") opts.onChange(quill.root.innerHTML);
  });

  return quill;
}

function getEditorHtml(quill) {
  return quill ? quill.root.innerHTML : "";
}

function setEditorHtml(quill, html) {
  if (quill) quill.root.innerHTML = html || "";
}
