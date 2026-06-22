import { Redirect, useLocalSearchParams } from "expo-router";

export default function TrainingSessionAlias() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={`/session/${id ?? ""}` as any} />;
}
