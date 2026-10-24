package sg.nus.carelink.profile.application;

import java.time.LocalDate;

import sg.nus.carelink.profile.domain.model.Elder;

/**
 * An elder joined with the plan status and next visit date careplan owns. planStatus is one of
 * "published", "draft", "stopped" or "none" — a superseded plan reads as "none" (a newer version
 * exists and is what the manager sees instead), while a stopped plan reads as "stopped" (it was
 * ended early and has no newer version replacing it yet); planVersion is null exactly when
 * planStatus is "none". nextVisitDate is null unless planStatus
 * is "published" or "draft" and the elder's published plan has at least one scheduled visit on
 * or after today. primaryCaregiver is null while the elder has none assigned. hasPublishedPlan is
 * true while a published version is in force, including while a newer version is still a draft,
 * so the manager's worklist can tell a first draft from a revision. hasCareRequest is true once
 * the family has asked for care: the approved intake application that created the elder, or a
 * service application in any status. openCareRequests counts the service applications still open:
 * neither declined nor fully answered by a published version (ServiceApplicationProgress). The
 * intake application is left out, since it can't be declined and so could never be cleared.
 */
public record ElderSummary(
		Elder elder,
		String planStatus,
		Integer planVersion,
		LocalDate nextVisitDate,
		PrimaryCaregiverSummary primaryCaregiver,
		boolean hasPublishedPlan,
		boolean hasCareRequest,
		int openCareRequests) {

	public ElderSummary(Elder elder, String planStatus, Integer planVersion, LocalDate nextVisitDate) {
		this(elder, planStatus, planVersion, nextVisitDate, null);
	}

	/** For a latest plan that is not a revision: only a published one is in force. */
	public ElderSummary(Elder elder, String planStatus, Integer planVersion, LocalDate nextVisitDate,
			PrimaryCaregiverSummary primaryCaregiver) {
		this(elder, planStatus, planVersion, nextVisitDate, primaryCaregiver, "published".equals(planStatus), false, 0);
	}

	public ElderSummary(Elder elder, String planStatus, Integer planVersion, LocalDate nextVisitDate,
			PrimaryCaregiverSummary primaryCaregiver, boolean hasPublishedPlan) {
		this(elder, planStatus, planVersion, nextVisitDate, primaryCaregiver, hasPublishedPlan, false, 0);
	}

	ElderSummary withCareRequests(boolean hasCareRequest, int openCareRequests) {
		return new ElderSummary(elder, planStatus, planVersion, nextVisitDate, primaryCaregiver, hasPublishedPlan,
				hasCareRequest, openCareRequests);
	}
}
