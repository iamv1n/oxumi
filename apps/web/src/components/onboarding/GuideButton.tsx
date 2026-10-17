"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useOnboarding } from "./OnboardingProvider";

// Replays the guide for whichever page is showing.
export default function GuideButton() {
  const { start, available } = useOnboarding();
  return (
    <Tooltip title={available ? "Show me around this page" : "No guide for this page"}>
      <Button
        type="text"
        shape="circle"
        icon={<QuestionCircleOutlined />}
        aria-label="Show the guide for this page"
        disabled={!available}
        onClick={start}
        data-tour="guide-button"
      />
    </Tooltip>
  );
}
