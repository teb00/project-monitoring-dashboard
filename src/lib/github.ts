export interface GitHubRepository {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  description: string;
  htmlUrl: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  createdAt: string;
  updatedAt: string;
  topics: string[];
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepositoryResponse[];
}

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  created_at: string;
  updated_at: string;
  topics?: string[];
  owner?: { login?: string };
}

export interface GitHubSearchResult {
  repositories: GitHubRepository[];
  totalCount: number;
  rateLimitRemaining: number | null;
}

export class GitHubApiError extends Error {
  readonly status: number;
  readonly rateLimitReset: number | null;

  constructor(status: number, message: string, rateLimitReset: number | null) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.rateLimitReset = rateLimitReset;
  }
}

const API_URL = "https://api.github.com/search/repositories";
const REQUEST_TIMEOUT_MS = 12_000;

function isGitHubUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "github.com" || url.hostname.endsWith(".github.com"));
  } catch {
    return false;
  }
}

function mapRepository(repository: GitHubRepositoryResponse): GitHubRepository {
  const htmlUrl = isGitHubUrl(repository.html_url)
    ? repository.html_url
    : "https://github.com";
  return {
    id: repository.id,
    fullName: repository.full_name,
    name: repository.name,
    owner: repository.owner?.login ?? repository.full_name.split("/")[0],
    description: repository.description ?? "No description provided.",
    htmlUrl,
    language: repository.language ?? "Unknown",
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    watchers: repository.watchers_count,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    topics: repository.topics ?? [],
  };
}

export async function searchGitHubRepositories(
  query: string,
  signal?: AbortSignal,
): Promise<GitHubSearchResult> {
  const normalizedQuery = query.trim().slice(0, 200);
  const params = new URLSearchParams({
    q: normalizedQuery || "topic:computer-systems",
    sort: "stars",
    order: "desc",
    per_page: "30",
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortRequest = () => controller.abort();
  signal?.addEventListener("abort", abortRequest, { once: true });

  try {
    const response = await fetch(`${API_URL}?${params}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });

    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    if (!response.ok) {
      throw new GitHubApiError(
        response.status,
        response.status === 403 || response.status === 429
          ? "GitHub API rate limit reached. Try again later."
          : "GitHub could not complete this search.",
        reset ? Number(reset) * 1000 : null,
      );
    }

    const payload = (await response.json()) as GitHubSearchResponse;
    return {
      repositories: payload.items.map(mapRepository),
      totalCount: payload.total_count,
      rateLimitRemaining: remaining ? Number(remaining) : null,
    };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}
