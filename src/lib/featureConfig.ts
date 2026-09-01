export type InstituteMode = "offline" | "online" | "hybrid";

export interface FeatureCapability {
  key: string;
  name: string;
  description: string;
  category: "academic" | "attendance" | "communication" | "portal";
  enabledFor: InstituteMode[];
}

export const FEATURE_CAPABILITIES: FeatureCapability[] = [
  {
    key: "physical_classrooms",
    name: "Physical Classrooms & Bench Allocation",
    description: "Manage campus rooms, desks, and in-person lecture halls.",
    category: "academic",
    enabledFor: ["offline", "hybrid"],
  },
  {
    key: "virtual_classrooms",
    name: "Online Virtual Classes & Streaming",
    description: "Integrate Google Meet, Zoom, and digital live video lectures.",
    category: "academic",
    enabledFor: ["online", "hybrid"],
  },
  {
    key: "in_person_attendance",
    name: "In-Person Classroom Attendance",
    description: "Biometric or QR code based physical classroom attendance.",
    category: "attendance",
    enabledFor: ["offline", "hybrid"],
  },
  {
    key: "digital_attendance",
    name: "Digital Session Join Tracking",
    description: "Automatic attendance logging during online live sessions.",
    category: "attendance",
    enabledFor: ["online", "hybrid"],
  },
  {
    key: "hybrid_scheduling",
    name: "Dual-Mode (Hybrid) Batch Scheduling",
    description: "Schedule concurrent physical classroom & online live streams.",
    category: "academic",
    enabledFor: ["hybrid"],
  },
  {
    key: "campus_notices",
    name: "Physical Campus Bulletin Board",
    description: "Post notices for physical institute campus visitors.",
    category: "communication",
    enabledFor: ["offline", "hybrid"],
  },
  {
    key: "digital_assignments",
    name: "Online Assignment Submissions",
    description: "Cloud file uploads and online student assignment portal.",
    category: "portal",
    enabledFor: ["online", "hybrid"],
  },
];

export function getFeatureConfiguration(mode: InstituteMode | string | null | undefined) {
  const currentMode: InstituteMode =
    mode === "offline" || mode === "online" || mode === "hybrid" ? mode : "hybrid";

  const enabledFeatures = FEATURE_CAPABILITIES.filter((feat) =>
    feat.enabledFor.includes(currentMode)
  );

  const disabledFeatures = FEATURE_CAPABILITIES.filter(
    (feat) => !feat.enabledFor.includes(currentMode)
  );

  return {
    mode: currentMode,
    enabledFeatures,
    disabledFeatures,
    isFeatureEnabled: (featureKey: string): boolean => {
      const feat = FEATURE_CAPABILITIES.find((f) => f.key === featureKey);
      return feat ? feat.enabledFor.includes(currentMode) : false;
    },
  };
}
