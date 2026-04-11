import { z } from "zod";

import rawLandingPage from "@/content/landing-page.json";
import { getPrompt, handleToolCall } from "@/lib/mcp";
import { loadProductSurface } from "@/lib/product-surface";
import type { LandingPageContent } from "@/lib/types";

const landingPageSchema = z.object({
  product_name: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  subhead: z.string(),
  primary_cta_label: z.string(),
  secondary_cta_label: z.string(),
  hero_facts: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .min(3),
  workflow_heading: z.string(),
  workflow_support: z.string(),
  workflow_steps: z
    .array(
      z.object({
        id: z.string(),
        artifact_label: z.string(),
        title: z.string(),
        body: z.string(),
        review_focus: z.string(),
      }),
    )
    .length(5),
  install_label: z.string(),
  install_support: z.string(),
  dogfood_label: z.string(),
  dogfood_support: z.string(),
  proof_heading: z.string(),
  proof_support: z.string(),
  outcomes_heading: z.string(),
  outcomes_support: z.string(),
  outcomes: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(3),
  context_heading: z.string(),
  context_support: z.string(),
  final_heading: z.string(),
  final_support: z.string(),
  final_primary_cta_label: z.string(),
  final_secondary_cta_label: z.string(),
});

const workflowBundleResultSchema = z.object({
  bundle: z.object({
    workflow: z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
    }),
    guardrails: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
      }),
    ),
    examples: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        lesson: z.string(),
        scenario: z.string(),
        raw_output: z.string(),
        corrected_output: z.string(),
        workflow_id: z.string(),
        verdict: z.object({
          reasons: z.array(z.string()).min(1),
        }),
      }),
    ),
    starter_instructions: z.string(),
  }),
});

const guardrailResultSchema = z.object({
  resource: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    intent: z.object({
      good_judgment: z.string(),
    }),
  }),
});

const exampleResultSchema = z.object({
  resource: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    lesson: z.string(),
    scenario: z.string(),
    raw_output: z.string(),
    corrected_output: z.string(),
    workflow_id: z.string(),
    verdict: z.object({
      reasons: z.array(z.string()).min(1),
    }),
  }),
});

const FIRST_PASS_FEATURE_INTENT = "Generate the JudgmentKit.com landing page";
const REFINEMENT_FEATURE_INTENT =
  "Refine the JudgmentKit.com landing page for copy distinctness and human-first onboarding";
const REFINEMENT_GOAL =
  "copy distinctness, clarity, and first-time usability for buyers and operators";
const REFINEMENT_KNOWN_ISSUES = [
  "Connect appears as both a primary action and a descriptive section label",
  "Inspect and raw-reference language overlap across headings, close copy, and the secondary CTA",
  "section descriptions and action labels are still too semantically similar on the public site",
];
const REFINEMENT_MUST_KEEP = [
  "multi-client MCP install surface",
  "published workflow, guardrail, and example proof",
  "the /inspect route for raw references",
  "a clear line between the human decision-maker and the agent using the MCP",
];
const REFINEMENT_FIX_NOW = [
  "reserve action verbs for buttons and step actions",
  "rename descriptive sections so they do not echo Connect or Inspect",
  "feature the copy-distinctness guardrail and repetitive-copy example in the proof path",
];
const REFINEMENT_ESCALATE = [
  "any request to foreground raw artifact inventory above the onboarding path",
  "any request that treats the agent as the landing-page audience",
  "any new landing-page primitive that is not already approved by the design system",
  "any unclear tradeoff between sharper messaging, trustworthy provenance, and copy-role distinctness",
];
const REFINEMENT_REVIEW_CHECKLIST = [
  "what JudgmentKit is and who it is for are obvious in one screen",
  "human decision path appears before MCP mechanics and raw references",
  "section headings describe content instead of repeating CTA language",
  "Connect and raw-reference actions are distinct from adjacent descriptive copy",
  "agents are described as downstream users, not the audience",
];
const V2_BRIEF =
  "Build a clearer JudgmentKit landing page for human buyers and operators. Make what JudgmentKit is, why a team would employ it, and how to connect it obvious in one screen. Reserve action verbs for interactive controls, keep descriptive headings distinct from actions, move raw references lower, preserve MCP credibility without making MCP the hero, and use proof only after the next action is clear.";
const CLARITY_EXAMPLE_ID = "example.ui-generation.repetitive-copy-drift";

function renderDogfoodBundleCall() {
  return `get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: ${JSON.stringify(
    REFINEMENT_FEATURE_INTENT,
  )} })`;
}

function renderExampleCall(exampleId: string) {
  return `get_example({ id: ${JSON.stringify(exampleId)} })`;
}

function renderGuardrailCall(guardrailId: string) {
  return `get_resource({ id: ${JSON.stringify(guardrailId)} })`;
}

function renderLandingPageDraftPacket(content: z.infer<typeof landingPageSchema>) {
  return [
    `Sections: hero (${content.headline}), workflow (${content.workflow_heading}), proof (${content.proof_heading}), outcomes (${content.outcomes_heading}), context (${content.context_heading}), and close (${content.final_heading}).`,
    `Hero copy: ${content.headline} ${content.subhead}`,
    `CTA path: primary ${content.primary_cta_label}; secondary ${content.secondary_cta_label}; close action ${content.final_secondary_cta_label}.`,
    "Copy drift: Connect is doing double duty as the main action and as descriptive page language.",
    "Copy drift: raw-reference language is spread across headings, close copy, and secondary actions instead of staying in one clear utility role.",
    "Role overlap: section descriptions and action labels are still semantically too close on the public site.",
  ].join(" ");
}

async function expectToolResult<T>(
  name: string,
  args: Record<string, unknown>,
  schema: z.ZodSchema<T>,
) {
  const result = await handleToolCall(name, args);
  if ("error" in result) {
    throw new Error(`JudgmentKit MCP call failed for ${name}: ${result.error.message}`);
  }

  return schema.parse(result);
}

export async function loadLandingPage(
  httpMcpEndpoint: string,
): Promise<LandingPageContent> {
  const content = landingPageSchema.parse(rawLandingPage);
  const productSurface = loadProductSurface(httpMcpEndpoint);
  const genericPrompt = getPrompt("start_design_workflow");
  const firstPassDraft = renderLandingPageDraftPacket(content);
  const refinementPrompt = getPrompt("refine_design_first_pass", {
    feature_intent: REFINEMENT_FEATURE_INTENT,
    draft: firstPassDraft,
    refinement_goal: REFINEMENT_GOAL,
    must_keep: REFINEMENT_MUST_KEEP.join("; "),
    known_issues: REFINEMENT_KNOWN_ISSUES.join("; "),
  });
  const v2Prompt = getPrompt("start_design_workflow", {
    feature_intent: V2_BRIEF,
  });
  const firstPassPrompt = getPrompt("start_design_workflow", {
    feature_intent: FIRST_PASS_FEATURE_INTENT,
  });

  if (
    "error" in genericPrompt ||
    "error" in refinementPrompt ||
    "error" in v2Prompt ||
    "error" in firstPassPrompt
  ) {
    throw new Error("Missing JudgmentKit MCP prompt.");
  }

  const workflowBundle = await expectToolResult(
    "get_workflow_bundle",
    {
      workflow_id: "workflow.ai-ui-generation",
      feature_intent: REFINEMENT_FEATURE_INTENT,
    },
    workflowBundleResultSchema,
  );
  const selectedGuardrail = await expectToolResult(
    "get_resource",
    { id: "guardrail.ui-copy-clarity" },
    guardrailResultSchema,
  );
  const exampleResult = await expectToolResult(
    "get_example",
    { id: CLARITY_EXAMPLE_ID },
    exampleResultSchema,
  );

  const workflow = workflowBundle.bundle.workflow;
  const bundledExample = workflowBundle.bundle.examples.find(
    (entry) => entry.id === CLARITY_EXAMPLE_ID,
  );

  if (!bundledExample) {
    throw new Error(`Missing published ${CLARITY_EXAMPLE_ID} in workflow bundle.`);
  }

  const example = exampleResult.resource;
  const exampleInspectHref = `/inspect#resource-${example.id}`;
  const workflowInspectHref = `/inspect#resource-${workflow.id}`;
  const selectedGuardrailInspectHref = `/inspect#resource-${selectedGuardrail.resource.id}`;

  const dogfoodRun = {
    feature_intent: REFINEMENT_FEATURE_INTENT,
    draft: firstPassDraft,
    refinement_goal: REFINEMENT_GOAL,
    known_issues: REFINEMENT_KNOWN_ISSUES,
    must_keep: REFINEMENT_MUST_KEEP,
    fix_now: REFINEMENT_FIX_NOW,
    escalate: REFINEMENT_ESCALATE,
    refinement_prompt: refinementPrompt.template,
    v2_brief: V2_BRIEF,
    v2_generation_prompt: v2Prompt.template,
    bundle_call: renderDogfoodBundleCall(),
    guardrail_call: renderGuardrailCall("guardrail.ui-copy-clarity"),
    example_call: renderExampleCall(example.id),
    brand_tone_good_judgment: selectedGuardrail.resource.intent.good_judgment,
    review_checklist: REFINEMENT_REVIEW_CHECKLIST,
  };

  const workflowSteps = content.workflow_steps.map((step) => {
    switch (step.id) {
      case "brief":
        return {
          ...step,
          artifacts: [
            {
              label: "Feature intent",
              value: dogfoodRun.feature_intent,
            },
            {
              label: "Draft packet",
              value: dogfoodRun.draft,
              monospace: true,
            },
          ],
        };
      case "workflow-context":
        return {
          ...step,
          artifacts: [
            {
              label: "Workflow artifact",
              value: `${workflow.id} · ${workflow.title}`,
              href: workflowInspectHref,
            },
            {
              label: "Refinement goal",
              value: dogfoodRun.refinement_goal,
            },
          ],
        };
      case "apply-checks":
        return {
          ...step,
          artifacts: [
            {
              label: "Guardrail artifact",
              value: `${selectedGuardrail.resource.id} · ${selectedGuardrail.resource.title}`,
              href: selectedGuardrailInspectHref,
            },
            {
              label: "Calibration example",
              value: `${example.id} · ${example.title}`,
              href: exampleInspectHref,
            },
          ],
        };
      case "constrained-first-pass":
        return {
          ...step,
          artifacts: [
            {
              label: "Fix now",
              value: dogfoodRun.fix_now.join(" / "),
            },
            {
              label: "V2 brief",
              value: dogfoodRun.v2_brief,
              monospace: true,
            },
          ],
        };
      case "review-questions":
        return {
          ...step,
          artifacts: [
            {
              label: "Escalate",
              value: dogfoodRun.escalate.join(" / "),
            },
            {
              label: "Review checklist",
              value: dogfoodRun.review_checklist.join(" / "),
            },
          ],
        };
      default:
        return {
          ...step,
          artifacts: [],
        };
    }
  });

  return {
    ...content,
    install_targets: productSurface.install_targets,
    dogfood_run: dogfoodRun,
    first_message: genericPrompt.template,
    starter_prompt_name: genericPrompt.name,
    workflow_steps: workflowSteps,
    proof: {
      workflow_id: example.workflow_id,
      example_id: example.id,
      brief_text: example.scenario,
      uncontrolled_text: example.raw_output,
      guided_text: example.corrected_output,
    },
    proof_notes: productSurface.proof_notes,
    proof_lesson: example.lesson,
    proof_reasons: example.verdict.reasons,
    proof_inputs: [
      {
        type: "workflow",
        id: workflow.id,
        title: workflow.title,
        summary: workflow.summary,
        callout: dogfoodRun.bundle_call,
      },
      {
        type: "guardrail",
        id: selectedGuardrail.resource.id,
        title: selectedGuardrail.resource.title,
        summary: selectedGuardrail.resource.summary,
        callout: dogfoodRun.guardrail_call,
      },
      {
        type: "example",
        id: example.id,
        title: example.title,
        summary: example.summary,
        callout: dogfoodRun.example_call,
      },
    ],
    context_call: dogfoodRun.bundle_call,
    loaded_context: [
      {
        type: "workflow",
        id: workflow.id,
        title: workflow.title,
        summary: workflow.summary,
        url: workflowInspectHref,
      },
      ...workflowBundle.bundle.guardrails.map((guardrail) => ({
        type: "guardrail",
        id: guardrail.id,
        title: guardrail.title,
        summary: guardrail.summary,
        url: `/inspect#resource-${guardrail.id}`,
      })),
      ...workflowBundle.bundle.examples.map((bundleExample) => ({
        type: "example",
        id: bundleExample.id,
        title: bundleExample.title,
        summary: bundleExample.summary,
        url: `/inspect#resource-${bundleExample.id}`,
      })),
    ].filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    ),
    inspect: productSurface.inspect,
  };
}
