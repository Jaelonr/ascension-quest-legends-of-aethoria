import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#0c0b09] bg-cover bg-top p-4 text-[#eee5d7]"
      style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
    >
      <Card className="mx-4 w-full max-w-md rounded-none border-[#6b4d2f] bg-[#11100e]">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-[#d95f45]" />
            <h1 className="font-serif text-2xl font-bold text-[#e5c386]">Uncharted Gate</h1>
          </div>

          <p className="mt-4 text-sm text-[#cfc5b8]">
            The System cannot locate this path. Return to the Hall and choose a known route.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
