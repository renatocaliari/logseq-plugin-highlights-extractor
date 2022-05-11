import '@logseq/libs';
const settingsTemplate = [{
  key: "headerHighlights",
  type: 'string',
  default: "## Highlights",
  title: "Set the title where will be put the highlights",
  description: "It's the title of the block that will get all blocks with highlights",
},
{
  key: "openSideBarWithHighlights",
  type: 'boolean',
  default: "true",
  title: "Open sidebar",
  description: "Open sidebar with the extracted highlights",
}
]
logseq.useSettingsSchema(settingsTemplate)


const findHighlights = (content, globalMatch = true) => {
  // const rxBlockRef = new RegExp(`(===(.*?)===|\^\^(.*?)\^\^)`, `g`);
  // const rxBlockRef = /==(.*?)==/g;
  let rxBlockRef
  if (globalMatch) {
    rxBlockRef = /==(.*?)==|\^\^(.*?)\^\^/g;
  } else {
    rxBlockRef = /==(.*?)==|\^\^(.*?)\^\^/;
  }


  let match = content.match(rxBlockRef);
  if (match) {
    return match;
  } else {
    return null;
  }
};

export const extractHighlights = async (
  e,
  arrHighlights = []
) => {
  const block = await logseq.Editor.getBlock(e.uuid, {
    includeChildren: true,
  });

  const payload = {
    id: block.uuid,
    contentHighlighted: findHighlights(block.content),
  };

  if (payload.contentHighlighted !== null) {
    arrHighlights.push(payload);
  }
  if (block.children.length > 0) {
    for (const [idx, child] of block.children.entries()) {
      arrHighlights = await extractHighlights(child, arrHighlights);
    }
  }

  return arrHighlights;
};

export const createSectionHighlights = async (e, insertBlockWithHighlights = true) => {
  let arrHighlights = await extractHighlights(e);
  const block = await logseq.Editor.getBlock(e.uuid);


  if (!arrHighlights.length) {
    logseq.App.showMsg(
      "No highlights found. Please ensure that you have highlighted something under the block you called plugin Highlights Extractor.",
      "error"
    );
    return;
  }

  const arrHighlightsBlocks = [];
  const arrHighlightsClipboard = [];
  for (let h of arrHighlights) {
    if (h.contentHighlighted === null) {
      continue;
    } else if (h.contentHighlighted.length === 1) {
      let matchGroup = findHighlights(h.contentHighlighted[0], false);
      let onlyTextGroup = matchGroup[1] || matchGroup[2];
      const payload = {
        content: `[${onlyTextGroup}](${h.id})`,
      };
      arrHighlightsBlocks.push(payload);
      arrHighlightsClipboard.push(onlyTextGroup);
    } else {
      for (const [idx, group] of h.contentHighlighted.entries()) {
        let matchGroup = findHighlights(group, false);
        let onlyTextGroup = matchGroup[1] || matchGroup[2];
        const payload = {
          content: `[${onlyTextGroup}](${h.id})`,
        };
        arrHighlightsBlocks.push(payload);
        arrHighlightsClipboard.push(onlyTextGroup);

      }
    }
  }

  if (insertBlockWithHighlights) {
    const blockHeaderHighlight = await logseq.Editor.insertBlock(
      block.uuid,
      `${logseq.settings.headerHighlights}`,
      {
        before:
          block.content.includes(":: ") &&
            !block.content.includes("id:: ")
            ? false
            : true,
        sibling: true,
      }
    );

    await logseq.Editor.insertBatchBlock(
      blockHeaderHighlight.uuid,
      arrHighlightsBlocks,
      {
        before: false,
        sibling: false,
      }
    );

    await logseq.Editor.exitEditingMode();

    let openSideBarWithHighlights = (logseq.settings.openSideBarWithHighlights == "false") != Boolean(logseq.settings.openSideBarWithHighlights);
    if (openSideBarWithHighlights) {
      logseq.Editor.openInRightSidebar(blockHeaderHighlight.uuid);
    }
  }
  else {
    let textToClipboard = "";
    for (const [idx, hBlock] of arrHighlightsClipboard.entries()) {
      if (idx > 0) {
        textToClipboard = textToClipboard.concat("\n- " + hBlock);
      }
      textToClipboard = textToClipboard.concat("- " + hBlock);
    }
    copyToClipboard(textToClipboard);
  }
};

const main = async () => {
  logseq.Editor.registerBlockContextMenuItem("Highlights: Extract in a new block", async (e) => {
    createSectionHighlights(e);
  });
  logseq.Editor.registerBlockContextMenuItem("Highlights: Copy to clipboard", async (e) => {
    createSectionHighlights(e, false);
  });

  logseq.Editor.registerSlashCommand('Highlights: Extract in a new block', async (e) => {
    createSectionHighlights(e)
  })
  logseq.Editor.registerSlashCommand('Highlights: Copy to clipboard', async (e) => {
    createSectionHighlights(e, false)
  })

}

const copyToClipboard = (text) => {
  window.focus();
  navigator.clipboard.writeText(text).then(
    () => {
      logseq.App.showMsg(
        "Highlights copied to clipboard",
        "success"
      );
    }).catch((error) => {
      logseq.App.showMsg(
        "Error trying to copy highlights to clipboard",
        "error"
      );

    });
};

logseq.ready(main).catch(console.error);
