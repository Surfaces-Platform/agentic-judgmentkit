export type PageType =
  | "concept"
  | "workflow"
  | "guardrail"
  | "role"
  | "example"
  | "reference"
  | "start";

export type Status = "active" | "deprecated" | "draft";

export type Owners = {
  primary: string;
  risk?: string;
  operational?: string;
};

export type DocFrontmatter = {
  title: string;
  slug: string;
  page_type: PageType;
  summary: string;
  agent_summary: string;
  audiences: string[];
  workflows?: string[];
  guardrails?: string[];
  owners: Owners;
  status: Status;
  last_reviewed: string;
  related_pages: string[];
  related_resources: string[];
  related_schemas: string[];
  toc: boolean;
};

export type Heading = {
  level: number;
  text: string;
  id: string;
};

export type DocPage = {
  filePath: string;
  slug: string;
  markdownPath: string;
  frontmatter: DocFrontmatter;
  body: string;
  headings: Heading[];
};

export type ResourceIndexEntry = {
  id: string;
  type: string;
  version: string;
  title: string;
  summary: string;
  url: string;
  schema_url: string;
  hash: string;
  last_reviewed: string;
  tags: string[];
};

export type SchemaIndexEntry = {
  id: string;
  title: string;
  url: string;
  hash: string;
};

export type ResourceIndex = {
  version: string;
  generated_at: string;
  resources: ResourceIndexEntry[];
  schemas: SchemaIndexEntry[];
};

export type SearchDocument = {
  id: string;
  kind: "doc" | "resource";
  title: string;
  summary: string;
  url: string;
  pageType?: string;
  audiences?: string[];
  workflowIds?: string[];
  guardrailIds?: string[];
  headings?: string[];
  tags?: string[];
  searchText: string;
};

export type ChangelogEntry = {
  id: string;
  title: string;
  published_at: string;
  summary: string;
  changes: string[];
};

export type GraphNode = {
  id: string;
  type: "doc" | "resource";
  url: string;
  title: string;
  related: string[];
};

export type ProductSurfaceTransport = "http" | "stdio";
export type InstallerClientId = "codex" | "claude" | "cursor";

export type ProductSurfaceInstallTarget = {
  id: InstallerClientId;
  label: string;
  config_path: string;
};

export type InstallContractClient = {
  id: InstallerClientId;
  label: string;
  config_path: string;
  config_format: "json" | "toml";
};

export type InstallContractInstaller = {
  mode: "hosted-bootstrap";
  bootstrap_url: string;
  bootstrap_command: string;
  local_script_command: string;
  default_checkout_path: string;
  edits_config_by_default: boolean;
  supports_dry_run: boolean;
  supports_no_verify: boolean;
};

export type InstallContractRepository = {
  clone_url: string;
  local_path_placeholder: string;
  install_command: string;
};

export type InstallContractConnection = {
  command: string;
  args: string[];
};

export type InstallContractCommandReference = {
  name: string;
  description: string;
  docs_url: string;
  arguments: string[];
  example_call?: string;
};

export type InstallContractVerification = {
  method: "tools/list";
  server_name: string;
  instructions: string;
  expected_tools: string[];
  expected_prompts: string[];
  tool_reference: InstallContractCommandReference[];
  prompt_reference: InstallContractCommandReference[];
};

export type InstallContract = {
  version: string;
  product_name: string;
  manifest_url: string;
  command_reference_url: string;
  warning: string;
  installer: InstallContractInstaller;
  repository: InstallContractRepository;
  server_name: string;
  install_transport: ProductSurfaceTransport;
  connection: InstallContractConnection;
  supported_clients: InstallerClientId[];
  clients: InstallContractClient[];
  verification: InstallContractVerification;
};

export type ProductSurfaceProof = {
  workflow_id: string;
  example_id: string;
  brief_text: string;
  uncontrolled_text: string;
  guided_text: string;
};

export type ProductSurfaceContextItem = {
  type: string;
  id: string;
  title: string;
  summary: string;
  url: string;
};

export type ProductSurfaceReferenceLink = {
  group: string;
  label: string;
  url: string;
  kind: string;
};

export type ProductSurfaceInspectViewerMode = "prompt" | "json" | "schema";

export type ProductSurfaceInspectFormat = "json" | "markdown" | "text" | "html";

export type ProductSurfaceInspectItem = {
  id: string;
  category: string;
  type: string;
  version: string;
  title: string;
  summary: string;
  subtitle: string;
  url: string;
  schema_url?: string;
  last_reviewed: string;
  tags: string[];
  available_view_modes: ProductSurfaceInspectViewerMode[];
  default_view_mode: ProductSurfaceInspectViewerMode;
  prompt_text: string;
  raw_format: ProductSurfaceInspectFormat;
};

export type ProductSurfaceReferenceItem = {
  id: string;
  group: string;
  type: string;
  title: string;
  summary: string;
  subtitle: string;
  url: string;
  raw_format: ProductSurfaceInspectFormat;
};

export type ProductSurfaceInspectLink = {
  href: string;
  label: string;
  description: string;
};

export type ProductSurfaceContent = {
  product_name: string;
  surface_label: string;
  utility_sentence: string;
  run_sequence: string[];
  workbench_label: string;
  workbench_support: string;
  proof_heading: string;
  proof_support: string;
  proof_notes: string[];
  context_heading: string;
  context_support: string;
  install_targets: ProductSurfaceInstallTarget[];
  install_command: string;
  verify_prompt: string;
  install_contract: InstallContract;
  tool_reference: InstallContractCommandReference[];
  prompt_reference: InstallContractCommandReference[];
  proof: ProductSurfaceProof;
  loaded_context: ProductSurfaceContextItem[];
  inspect_primary_items: ProductSurfaceInspectItem[];
  inspect_reference_items: ProductSurfaceReferenceItem[];
  inspect: ProductSurfaceInspectLink;
};

export type LandingPageHeroFact = {
  label: string;
  value: string;
};

export type LandingPageProofInput = {
  type: string;
  id: string;
  title: string;
  summary: string;
  callout: string;
};

export type LandingPageOutcome = {
  title: string;
  description: string;
};

export type LandingPageDogfoodRun = {
  feature_intent: string;
  draft: string;
  refinement_goal: string;
  known_issues: string[];
  must_keep: string[];
  fix_now: string[];
  escalate: string[];
  refinement_prompt: string;
  v2_brief: string;
  v2_generation_prompt: string;
  review_checklist: string[];
  bundle_call: string;
  guardrail_call: string;
  example_call: string;
  brand_tone_good_judgment: string;
};

export type LandingPageWorkflowArtifact = {
  label: string;
  value: string;
  href?: string;
  monospace?: boolean;
};

export type LandingPageWorkflowStep = {
  id: string;
  artifact_label: string;
  title: string;
  body: string;
  artifacts: LandingPageWorkflowArtifact[];
  review_focus: string;
};

export type LandingPageSupportStep = {
  title: string;
  body: string;
};

export type LandingPageContent = {
  product_name: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  install_command: string;
  verify_prompt: string;
  inspect: ProductSurfaceInspectLink;
};
