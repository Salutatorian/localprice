import type { Metadata } from "next";
import { InstallGuide } from "@/components/install-guide";

export const metadata: Metadata = {
  title: "Install",
  description: "Add LocalPrice to your phone without the App Store or Play Store.",
};

export default function InstallPage() {
  return <InstallGuide />;
}
