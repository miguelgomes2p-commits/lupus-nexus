import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/emails-config/")({
  beforeLoad: () => {
    throw redirect({ to: "/scripts", replace: true });
  },
});
