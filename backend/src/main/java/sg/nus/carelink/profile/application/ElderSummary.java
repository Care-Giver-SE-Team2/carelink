package sg.nus.carelink.profile.application;

import sg.nus.carelink.profile.domain.model.Elder;

/**
 * An elder joined with the plan status careplan owns. planStatus is one of "published",
 * "draft" or "none" — a superseded plan reads as "none" (a newer version exists and is what
 * the manager sees instead), and a stopped plan also reads as "none" (it was ended early and
 * is no longer active, though unlike superseded it has no newer version replacing it yet);
 * planVersion is null exactly when planStatus is "none".
 */
public record ElderSummary(Elder elder, String planStatus, Integer planVersion) {
}
