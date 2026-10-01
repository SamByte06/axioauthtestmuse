import { redirect } from "next/navigation";

/** Root → Authority dashboard (the (authority) layout enforces auth). */
export default function Home() {
  redirect("/dashboard");
}
