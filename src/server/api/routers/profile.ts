import type { PostgrestError } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { generateObject, type Message } from "ai";
import _ from "lodash";
import { icons } from "lucide-react";
import dedent from "ts-dedent";
import type { Except } from "type-fest";
import { z } from "zod";

import { four_oh_mini, o3_mini } from "~/lib/ai/models/openai";
import { transformJsonIntoXml } from "~/lib/suggested-topics/utils";
import type { TablesInsert } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const DevelopmentThemesOutput = z.object({
  development_themes: z
    .array(
      z
        .object({
          icon: z
            .string()
            .describe(
              `A Lucide icon name that represents the development theme. Possible values are: ${Object.keys(icons).join(", ")}`,
            ),
          title: z
            .string()
            .describe(
              "A compelling, action-oriented title that captures a clear, observable trait or behavior (e.g., 'Building Consistency So You're a Leader People Can Rely On')",
            ),
          description: z
            .string()
            .describe(
              "A concise, insightful description that frames the development theme as a meaningful challenge or opportunity for professional growth",
            ),
          key_points: z
            .array(
              z
                .string()
                .describe(
                  "A specific, actionable insight that provides clear guidance on how to develop in this area",
                ),
            )
            .describe(
              "A focused set of AT LEAST TWO, AT MOST FOUR actionable insights that provide practical guidance for development",
            ),
          order: z
            .number()
            .describe(
              "The order (0-indexed) of the development theme, based on how relevant/important it is to the user's growth and development, where 0 is the most important and the highest priority",
            ),
        })
        .describe(
          "A cohesive development theme that addresses a specific professional trait or behavior pattern",
        ),
    )
    .describe(
      "A balanced collection of AT LEAST THREE, AT MOST FIVE development themes that address both strengths to leverage and areas for growth, tailored to the individual's unique professional context",
    ),
});
export type DevelopmentThemesOutput = z.infer<typeof DevelopmentThemesOutput>;

export const profileRouter = createTRPCRouter({
  getProfileEnhancements: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("profile_enhancements")
        .select("*")
        .eq("profile_id", input.profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no record found, return null without error
        if (error.code === "PGRST116") {
          return null;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      return data;
    }),

  getProfileDevelopmentThemes: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("profile_development_themes")
        .select("*")
        .eq("profile_id", input.profileId)
        .is("deleted_at", null)
        .order("order", { ascending: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      return data;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        nickname: z.string().optional(),
        image_url: z.string().optional(),
        dossier: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      // Update the profile
      if (input.nickname || input.image_url) {
        const updateObj: Record<string, unknown> = {};
        if (input.nickname) updateObj.nickname = input.nickname;
        if (input.image_url) updateObj.image_url = input.image_url;

        const { error: profileError } = await supabase
          .from("profiles")
          .update(updateObj)
          .eq("id", input.profileId);

        if (profileError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: profileError.message,
            cause: profileError,
          });
        }
      }

      // Update the profile_enhancements if dossier is provided
      if (input.dossier !== undefined) {
        // Check if a profile_enhancements record exists
        const { data: existingEnhancements, error: fetchError } = await supabase
          .from("profile_enhancements")
          .select("id")
          .eq("profile_id", input.profileId)
          .limit(1);

        if (fetchError && fetchError.code !== "PGRST116") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: fetchError.message,
            cause: fetchError,
          });
        }

        let enhancementsError: PostgrestError | null = null;

        if (existingEnhancements && existingEnhancements.length > 0) {
          // Update existing record
          const { error } = await supabase
            .from("profile_enhancements")
            .update({ dossier: input.dossier })
            .eq("id", existingEnhancements[0]?.id ?? "");

          enhancementsError = error;
        } else {
          // Create new record
          const { error } = await supabase
            .from("profile_enhancements")
            .insert({ profile_id: input.profileId, dossier: input.dossier });

          enhancementsError = error;
        }

        if (enhancementsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: enhancementsError.message,
            cause: enhancementsError,
          });
        }
      }

      return { success: true };
    }),

  generateDevelopmentThemes: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        dossier: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "nickname, profile_enhancements(dossier), development_themes:profile_development_themes(*)",
        )
        .eq("id", input.profileId)
        .eq("development_themes.is_enabled", true)
        .single();

      if (profileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: profileError.message,
          cause: profileError,
        });
      }

      const dossier =
        input.dossier ?? profile.profile_enhancements?.[0]?.dossier;

      if (!dossier) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No dossier found for profile",
        });
      }

      const conversationHistory: Except<Message, "id">[] = [
        {
          role: "user",
          content: dedent`
            # Professional Development Theme Analysis

            ## Context

            <context>
            You are a world-class executive coach with 20+ years of experience identifying transformative professional development opportunities. Your expertise lies in extracting personalized, high-impact growth themes from self-descriptions that have led to breakthrough performance for thousands of professionals across industries. Your analysis will form the foundation of a personalized development plan.
            </context>

            ## Development Theme Definition

            <development_theme_definition>
            A development theme represents a specific, observable pattern of professional behavior that:
              1. Highlights an existing strength that can be strategically leveraged for exponential impact
              2. Identifies a critical growth area that, when developed, would dramatically enhance professional effectiveness and career trajectory

            The most powerful development themes:
              - Are precisely targeted and immediately actionable, not generic platitudes
              - Focus on malleable behaviors and skills with clear paths to improvement
              - Frame challenges constructively as high-ROI opportunities
              - Directly connect to measurable professional outcomes and leadership effectiveness
              - Are anchored in concrete evidence and specific language from the person's self-description
              - Resonate deeply with the individual by incorporating their exact terminology and framing
            </development_theme_definition>

            ## Examples

            <examples>
              <example>
                <user_name>Kimberly Shenk</user_name>
                <input>
                  I'm Kimberly Shenk, Co-Founder and CEO of Novi, a sustainability-focused technology platform I built to help brands create clean, compliant products through vetted ingredient data and supply chain transparency. Our platform includes a database of over 20,000 ingredients from 150+ suppliers, enabling brands to meet various sustainability and regulatory standards. We serve more than 2,000 brands and formulators and have earned the trust of major retailers like Sephora, Target, and Ulta Beauty.
                  I work alongside my co-founders Yashi Shrestha and Jaleh Bisharat, and have assembled a strong leadership team including Daniel Brown as CRO and Ally Basak heading marketing. As CEO, I'm navigating the challenge of building a mission-driven company that delivers strong financial results while transitioning from founder-centric operations to systems-driven execution. I'm focused on developing leaders who can drive results independently, allowing me to shift from day-to-day operations to strategic leadership. This evolution involves building trust in my team, implementing clear accountability structures, and moving from reactive problem-solving to forward-looking strategy development.
                </input>
                <output>
                  {
                    "development_themes": [
                      {
                        "icon": "TrendingUpIcon",
                        "title": "Building a Mission-Driven Company That Still Hits Financial Goals",
                        "description": "Leading a company that's built on purpose — but making sure purpose isn't an excuse for missing real financial targets",
                        "key_points": [
                          "Balancing the passion of 'missionary' culture with the execution mindset of 'mercenary' culture — and hiring for the right mix",
                          "Learning to connect your company's story and impact to hard metrics like EBITDA, especially as you prepare for outside investors",
                          "Accepting that real impact at scale requires operational discipline — not just good intentions"
                        ],
                        "order": 0
                      },
                      {
                        "icon": "ClockIcon",
                        "title": "Shifting Novi from Founder-Driven to Systems-Driven Execution",
                        "description": "Stepping back from running everything yourself — and building systems and leaders that can keep the business moving without you",
                        "key_points": [
                          "Building a strong executive team and cross-functional systems so you're not the bottleneck anymore",
                          "Expanding your leadership bandwidth by putting clear ownership and accountability structures in place",
                          "Turning the board into a strategic asset — not something you just manage or control"
                        ],
                        "order": 1
                      },
                      {
                        "icon": "UsersIcon",
                        "title": "Building a Leadership Team That Owns Results Without You",
                        "description": "Raising the expectations on your executive team — and changing how you lead them",
                        "key_points": [
                          "Moving from fixing everything yourself to having leaders who own and drive solutions without you pulling",
                          "Being honest about who on your team can scale — and making hard calls when someone can't",
                          "Increasing transparency across teams so momentum builds without you having to manually drive it"
                        ],
                        "order": 2
                      },
                      {
                        "icon": "BookOpenIcon",
                        "title": "Stepping Up from Operator to Strategic CEO",
                        "description": "Shifting from doing the work to designing the company's future",
                        "key_points": [
                          "Building real trust in your team so you can delegate major responsibilities — without losing performance",
                          "Staying aware of old control habits — especially ones built from past experiences where letting go backfired",
                          "Moving from reactive crisis-solving to forward-looking strategy — using structured thinking and reflection"
                        ],
                        "order": 3
                      }
                    ]
                  }
                </output>
              </example>
              <example>
                <user_name>Tannr Allard</user_name>
                <input>
                  I'm Tannr Allard, Co-Founder and CTO at Khalani Labs, where we're building decentralized solver infrastructure for complex computational problems in the blockchain ecosystem. I work closely with my co-founder Kevin Wang and our specialized team including Wojciech Kołowski, Mateusz Pyzik, and Wojciech Zaborowski to drive innovation through technical expertise and community development.
                  At Khalani, my focus is creating infrastructure that enables decentralized networks to collaboratively tackle computationally intensive challenges. We specialize in blockchain innovation, developing frameworks for solving problems at scale within decentralized environments.
                  As CTO, I'm working on building consistency in my leadership style so my team can rely on me regardless of my energy levels. I'm developing flexibility to stay productive when plans change unexpectedly. I'm evolving beyond being just a technical contributor to fully embracing my CTO role, which includes anticipating market shifts and guiding company strategy.
                  I aim to foster a culture of curiosity and ownership through reliable leadership, becoming a mentor my team can trust. I'm also working with my co-founder to improve our decision-making process, avoiding the pattern of revisiting decisions repeatedly and maintaining strategic focus as our company grows.
                </input>
                <output>
                  {
                    "development_themes": [
                      {
                        "icon": "TrendingUpIcon",
                        "title": "Building Consistency So You're a Leader People Can Rely On",
                        "description": "You're working on smoothing out the highs and lows in your work cycles — so your team knows what to expect from you, even on tougher days.",
                        "key_points": [
                          "Building habits and rhythms that survive your low-energy cycles, not just your highs.",
                          "Learning how to stay steady and visible even when you're not firing on all cylinders.",
                          "Separating your personal ups and downs from your responsibility as CTO."
                        ],
                        "order": 0
                      },
                      {
                        "icon": "ClockIcon",
                        "title": "Staying Flexible When Plans and Priorities Shift",
                        "description": "Minor disruptions used to derail your entire day. Now you're training flexibility like a muscle — staying calm and productive even when things go sideways.",
                        "key_points": [
                          "Practicing fast resets when a meeting goes long or a task gets blocked.",
                          "Building resilience so you can stay effective without needing perfect conditions.",
                          "Making progress even when the day doesn't unfold exactly as planned."
                        ],
                        "order": 1
                      },
                      {
                        "icon": "BookOpenIcon",
                        "title": "Defining Your CTO Role — and Growing Beyond Just Building",
                        "description": "You're stepping fully into what it means to be a CTO — not just a great individual contributor or co-founder.",
                        "key_points": [
                          "Developing a sixth sense for how the company is evolving and where you need to lead.",
                          "Creating a clear playbook for how you manage learning, execution, and company strategy.",
                          "Staying ahead of market shifts instead of getting stuck in today's firefight."
                        ],
                        "order": 2
                      },
                      {
                        "icon": "BookOpenIcon",
                        "title": "Driving Culture Through Clear, Reliable Leadership",
                        "description": "You want to build a team culture that's driven by curiosity, ownership, and follow-through — and you know it starts with how you show up.",
                        "key_points": [
                          "Becoming the \"best teacher\" your team members ever had — not just the guy with great ideas.",
                          "Building trust through action, not just words — delivering on what you promise.",
                          "Helping your team think and act independently while knowing you've got their back."
                        ],
                        "order": 3
                      },
                      {
                        "icon": "BookOpenIcon",
                        "title": "Tightening Decision-Making to Avoid Endless Rehashing",
                        "description": "You and your co-founder noticed a pattern: revisiting decisions over and over without meaning to. Now you're working on locking in decisions and staying aligned as you move fast.",
                        "key_points": [
                          "Creating clear records of major decisions and sticking to them.",
                          "Catching when brainstorming drifts into unintentional new commitments.",
                          "Keeping strategic discussions focused and moving forward — not stuck in loops."
                        ],
                        "order": 4
                      }
                    ]
                  }
                </output>
              </example>
            </examples>

            ## Analysis Instructions

            <analysis_instructions>
            1. Perform a deep, nuanced analysis of the "About Me" text to identify the most significant professional patterns, strengths, and growth opportunities
            2. Extract 3-5 distinct, high-impact development themes that represent:
              - Exceptional strengths that can be strategically leveraged for breakthrough results
              - Critical growth areas where targeted development would create disproportionate professional impact
            3. For each theme:
              - Focus on specific, observable behaviors with clear paths to improvement
              - Ensure it's directly supported by concrete evidence and language from the text
              - Articulate how it directly impacts professional effectiveness and career trajectory
              - Make it immediately actionable with clear next steps
              - Use the person's exact terminology and framing to ensure deep resonance
            4. Create a balanced portfolio of themes that addresses both strengths and development areas
            5. Prioritize themes with the highest potential ROI for professional growth and leadership effectiveness
            </analysis_instructions>

            CRITICAL: The most powerful development themes are precisely targeted, evidence-based, and immediately actionable - not generic assessments. They must incorporate the person's exact language and terminology to ensure deep personal resonance and ownership.

            ## Inputs

            <user_name>
            ${profile.nickname ?? "[No user name provided]"}
            </user_name>

            <input>
            ${dossier}
            </input>

            ${transformJsonIntoXml(profile.development_themes, "previously_generated_development_themes")}

            ## Output
          `,
        },
      ];

      const {
        object: { development_themes: initialDevelopmentThemes },
      } = await generateObject({
        model: o3_mini,
        schema: DevelopmentThemesOutput,
        schemaName: "DevelopmentThemes",
        schemaDescription:
          "Personalized, high-impact professional development themes that identify both exceptional strengths to leverage and critical growth areas, extracted directly from an individual's self-description and expressed using their own language and framing.",
        messages: conversationHistory,
      });

      conversationHistory.push({
        role: "assistant",
        content: JSON.stringify(initialDevelopmentThemes, null, 2),
      });

      // Process and validate icons, replacing invalid ones
      let processedDevelopmentThemes = _.orderBy(
        initialDevelopmentThemes,
        [(theme) => theme.order],
        ["asc"],
      ).map((theme) => ({
        ...theme,
        icon: _.upperFirst(_.camelCase(theme.icon)),
      }));
      let invalidIconsRemaining = processedDevelopmentThemes.filter(
        (theme) => !Object.keys(icons).includes(theme.icon),
      );

      while (invalidIconsRemaining.length > 0) {
        const iconToDataMap = invalidIconsRemaining.map(
          ({ icon, ...theme }) => ({
            iconToReplace: icon,
            data: theme,
          }),
        );

        conversationHistory.push({
          role: "user",
          content: dedent`
            The following icons are invalid:

            <invalid_icons>
            ${invalidIconsRemaining.map((theme) => theme.icon).join(", ")}
            </invalid_icons>

            For each invalid icon, please replace it with a valid icon.

            Here is the data for each invalid icon:

            <icon_to_data_map>
            ${JSON.stringify(iconToDataMap, null, 2)}
            </icon_to_data_map>

            <expected_output>
            {
              "icons_to_replace": [
                {
                  "icon_to_replace": "[a valid Lucide icon name]",
                  "replacement_icon": "[a valid Lucide icon name]"
                }
              ]
            }
            </expected_output>
          `,
        });

        const {
          object: { icons_to_replace },
        } = await generateObject({
          model: four_oh_mini,
          schema: z.object({
            icons_to_replace: z
              .array(
                z.object({
                  icon_to_replace: z
                    .string()
                    .describe("The invalid icon to replace"),
                  replacement_icon: z
                    .string()
                    .describe(
                      "The valid icon to replace the invalid icon with",
                    ),
                }),
              )
              .describe(
                "A list of icons to replace with valid Lucide icon names.",
              ),
          }),
          schemaName: "IconsToReplace",
          schemaDescription:
            "A list of icons to replace with valid Lucide icon names.",
          messages: conversationHistory,
        });

        conversationHistory.push({
          role: "assistant",
          content: JSON.stringify(icons_to_replace, null, 2),
        });

        // Update themes with valid icons
        processedDevelopmentThemes = processedDevelopmentThemes.map((theme) => {
          const iconToReplace = icons_to_replace.find(
            (icon) => icon.icon_to_replace === theme.icon,
          );

          return iconToReplace
            ? {
                ...theme,
                icon: _.upperFirst(_.camelCase(iconToReplace.replacement_icon)),
              }
            : theme;
        });

        // Check if any invalid icons remain
        invalidIconsRemaining = processedDevelopmentThemes.filter(
          (theme) => !Object.keys(icons).includes(theme.icon),
        );
      }

      // Soft delete existing profile development themes for this user
      const { error: softDeleteError } = await supabase
        .from("profile_development_themes")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("profile_id", input.profileId);

      if (softDeleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: softDeleteError.message,
          cause: softDeleteError,
        });
      }

      // Insert new development themes
      const developmentThemesToInsert = processedDevelopmentThemes.map(
        (developmentTheme, index) =>
          ({
            profile_id: input.profileId,
            icon: developmentTheme.icon,
            title: developmentTheme.title,
            description: developmentTheme.description,
            key_points: developmentTheme.key_points,
            order: developmentTheme.order,
            is_enabled: index < 3,
          }) satisfies TablesInsert<"profile_development_themes">,
      );

      const { data: insertedDevelopmentThemes, error: insertError } =
        await supabase
          .from("profile_development_themes")
          .insert(developmentThemesToInsert)
          .select("*");

      if (insertError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: insertError.message,
          cause: insertError,
        });
      }

      return {
        success: true,
        developmentThemes: insertedDevelopmentThemes,
      };
    }),
});
