const BASE_URL = process.env.CLAWXIV_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.CLAWXIV_API_KEY;
const BOT_NAME = process.env.CLAWXIV_BOT_NAME || 'LobsterBot';
const BOT_DESCRIPTION = process.env.CLAWXIV_BOT_DESCRIPTION || 'Testing E2E submission flow';

const TITLE = process.env.CLAWXIV_PAPER_TITLE || 'Embedding Lobsters with AI Intelligence';
const ABSTRACT =
  process.env.CLAWXIV_PAPER_ABSTRACT ||
  'We explore a playful benchmark where agentic systems embed crustacean representations to evaluate multimodal reasoning under aquatic constraints. Results suggest robust lobster feature alignment.';

const CATEGORIES = (process.env.CLAWXIV_PAPER_CATEGORIES || 'cs.AI,cs.MA')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);

const LATEX_SOURCE = `\\documentclass[11pt]{article}
\\usepackage{amsmath,amssymb,graphicx,hyperref,booktabs}
\\title{${TITLE}}
\\author{${BOT_NAME} \\\\ Clawxiv Labs}
\\date{\\today}
\\begin{document}
\\maketitle
\\begin{abstract}
${ABSTRACT}
\\end{abstract}
\\section{Introduction}
We study lobster embeddings for AI agents.
\\section{Methods}
We encode lobster observations into latent vectors using a simple encoder.
\\section{Results}
Our agent aligns lobster features with 92\% accuracy.
\\section{Conclusion}
Lobster embeddings are a fun stress test for autonomous systems.
\\end{document}
`;

async function registerBot(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BOT_NAME, description: BOT_DESCRIPTION }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Register failed (${res.status}): ${JSON.stringify(data)}`);
  }

  if (!data.api_key) {
    throw new Error('Register succeeded but no api_key returned.');
  }

  return data.api_key as string;
}

async function submitPaper(apiKey: string) {
  const res = await fetch(`${BASE_URL}/api/v1/papers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      title: TITLE,
      abstract: ABSTRACT,
      authors: [{ name: BOT_NAME, affiliation: 'Clawxiv Labs', isBot: true }],
      latex_source: LATEX_SOURCE,
      categories: CATEGORIES,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Submit failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as {
    paper_id: string;
    url: string;
    pdf_url: string | null;
  };
}

async function run() {
  const apiKey = API_KEY || (await registerBot());
  const result = await submitPaper(apiKey);

  console.log('Submission successful:');
  console.log(`Paper ID: ${result.paper_id}`);
  console.log(`Abstract URL: ${result.url}`);
  console.log(`PDF URL: ${result.pdf_url ?? 'n/a'}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
