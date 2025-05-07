import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

export function useSkillManagement(
  skill: RouterOutputs["skills"]["getAllSkills"][number],
  profileId: string,
  onSkillEnabled?: () => void,
  onSkillDisabled?: () => void,
) {
  const utils = api.useUtils();

  const { mutate: enableSkill, isPending: isEnablingSkill } =
    api.skills.enableSkill.useMutation({
      onSuccess: async () => {
        toast.success(`"${skill.title}" enabled`, {
          description: "You can now track your skill progress",
        });
        await utils.skills.getAllSkills.invalidate();
        onSkillEnabled?.();
      },
      onError: (error) => {
        console.log(error);
        toast.error(error.message);
      },
    });

  const { mutate: disableSkill, isPending: isDisablingSkill } =
    api.skills.disableSkill.useMutation({
      onSuccess: async () => {
        toast.success(`"${skill.title}" disabled`, {
          description: "You can re-enable it anytime",
        });
        await utils.skills.getAllSkills.invalidate();
        onSkillDisabled?.();
      },
      onError: (error) => {
        console.log(error);
        toast.error(error.message);
      },
    });

  const handleSkillEnable = () => {
    enableSkill({
      skillId: skill.id,
      profileId: profileId,
      generateAssessment: profileId === "71b372dc-3d42-40c1-838d-248460d1e50d",
    });
  };

  const handleSkillDisable = () => {
    disableSkill({
      skillId: skill.id,
      profileId: profileId,
    });
  };

  const isLoading = isEnablingSkill || isDisablingSkill;

  return {
    enableSkill: handleSkillEnable,
    disableSkill: handleSkillDisable,
    isEnablingSkill,
    isDisablingSkill,
    isLoading,
  };
}
