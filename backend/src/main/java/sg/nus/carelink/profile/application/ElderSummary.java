package sg.nus.carelink.profile.application;

import java.time.LocalDate;

import sg.nus.carelink.profile.domain.model.Elder;

/**
 * An elder joined with the plan status and next visit date careplan owns. planStatus is one of
 * "published", "draft", "stopped" or "none" — a superseded plan reads as "none" (a newer version
 * exists and is what the manager sees instead), while a stopped plan reads as "stopped" (it was
 * ended early and has no newer version replacing it yet); planVersion is null exactly when
 * planStatus is "none". nextVisitDate is null unless planStatus
 * is "published" and the plan has at least one scheduled visit on or after today.
 */
public record ElderSummary(Elder elder, String planStatus, Integer planVersion, LocalDate nextVisitDate) {
}
