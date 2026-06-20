import { AethoriaHeader, AethoriaPage } from "@/components/shared/aethoria-page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ScrollText } from "lucide-react";

const copy = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "Launch readiness placeholder",
    sections: [
      ["Data collected", "Ascension Quest: Legends of Aethoria may store account details, training logs, nutrition entries, biometrics you enter, equipment access, wearable records you import, Guildmaster memories, and gameplay progression."],
      ["How data is used", "Data is used to personalize commissions, combat replays, Guildmaster guidance, rewards, and progress summaries."],
      ["Wearables", "Native Apple Health and Health Connect collection is not active in this build. Manual logging is supported; future integrations should request explicit permission."],
      ["Production note", "Before real launch, this placeholder should be reviewed and replaced with counsel-approved policy language."],
    ],
  },
  terms: {
    title: "Terms And Health Disclaimer",
    subtitle: "Practical boundaries before real users arrive",
    sections: [
      ["Fitness guidance", "The app provides general training and nutrition guidance for motivation and planning. It is not medical advice."],
      ["Pain and injury", "Users should not train through sharp, worsening, or concerning pain. Medical concerns should go to qualified professionals."],
      ["No guaranteed outcomes", "XP, ranks, and fantasy rewards are motivational framing. Real-world results depend on consistency, recovery, nutrition, genetics, and health context."],
      ["Production note", "Final terms should be reviewed before launch."],
    ],
  },
  data: {
    title: "Data Export And Deletion",
    subtitle: "User control roadmap",
    sections: [
      ["Export data", "A production export should include workouts, nutrition, biometrics, wearable imports, character progression, Chronicle records, and Guildmaster memories."],
      ["Delete data", "A production deletion request should remove or anonymize personal records according to the final privacy policy and legal requirements."],
      ["Current status", "This page is a transparent placeholder. The backend deletion/export workflow still needs a launch-ready implementation."],
      ["Configuration checklist", "Before launch, verify Clerk authentication, PostgreSQL migrations, OpenAI fallback behavior, development mock isolation, legal copy review, app versioning, and production export/delete workflows."],
      ["Health imports", "Apple Health and Health Connect remain coming-soon surfaces unless native permission collection and deduplication are fully implemented in the mobile build."],
    ],
  },
};

export default function LegalPage({ type }: { type: keyof typeof copy }) {
  const page = copy[type];
  return (
    <AethoriaPage>
      <AethoriaHeader icon={ScrollText} title={page.title} subtitle={page.subtitle} />
      {page.sections.map(([title, text]) => (
        <Card key={title} className="rounded-none border-[#3b3328] bg-[#11100e]">
          <CardContent className="p-4">
            <h2 className="font-serif text-sm font-bold text-[#d9ad63]">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#d8c4a5]">{text}</p>
          </CardContent>
        </Card>
      ))}
      <Link href="/character">
        <Button variant="outline" className="w-full rounded-none border-[#6b4d2f] text-[#d9ad63]">Back to Character</Button>
      </Link>
    </AethoriaPage>
  );
}
