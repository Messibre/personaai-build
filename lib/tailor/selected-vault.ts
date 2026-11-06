import type { ContentSelection } from "@/lib/schemas/tailoring-preferences"
import type { Vault } from "@/lib/schemas/vault"

/** The vault reduced to what the user chose to include. Shared by the browser and the publish route. */
export function selectedVault(vault: Vault, selection: ContentSelection): Vault {
  return {
    ...vault,
    tailoringPreferences: undefined,
    github: selection.github ? vault.github : undefined,
    person: {
      name: vault.person.name,
      ...(selection.contacts.includes("email") && vault.person.email ? { email: vault.person.email } : {}),
      links: vault.person.links.filter((link) => selection.contacts.includes(link)),
    },
    experience: vault.experience.filter((item) => selection.experience.includes(item.id)),
    education: vault.education.filter((item) => selection.education.includes(item.id)),
  }
}
