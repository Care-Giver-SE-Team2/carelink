package sg.nus.carelink.report.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.report.application.ReportService;
import sg.nus.carelink.report.controller.dto.ReportRequests;
import sg.nus.carelink.report.controller.dto.ReportResponses;
import sg.nus.carelink.report.domain.model.Report;

/**
 * HTTP for UC-MG07: generate the period's reports, list them, read one, append a correction.
 *
 * <p>Presentation only - HTTP in, HTTP out, status codes. Talks to ReportService only, never
 * to a repository (ArchUnit enforces it). The paths are the ones drafted in
 * {@code docs/api/openapi-draft.yaml}; the contract was written first and this is made to
 * match it.
 *
 * <p>There is no PUT, PATCH or DELETE here, on purpose and permanently: a filed report cannot
 * be edited or removed (UC-MG07 5a), only corrected by appending. The rule is enforced by the
 * endpoints not existing rather than by an endpoint that always refuses.
 *
 * <p>Every endpoint is for managers. The contract also describes a family member's read of
 * the list and of one report; that branch belongs to UC-FM04 and is not served here, so a
 * family session is refused with 403 like any other role.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

	private final ReportService service;
	private final IdentityService identity;

	public ReportController(ReportService service, IdentityService identity) {
		this.service = service;
		this.identity = identity;
	}

	/**
	 * Steps 1 to 4, by hand: the three readers' reports for a period, for one elder or for
	 * every elder with a visit in it.
	 *
	 * <p>202 as the contract says. Generation is finished when this answers - the reports are
	 * filed and returned - but asking again for the same period hands back the same reports
	 * rather than new ones, which is not what 201 would promise.
	 */
	@PostMapping("/generate")
	@ResponseStatus(HttpStatus.ACCEPTED)
	@PreAuthorize("hasRole('MANAGER')")
	public List<ReportResponses.ReportView> generate(
			@Valid @RequestBody ReportRequests.Generate body,
			Principal principal) {

		Long requestedBy = identity.require(principal.getName()).id();
		return service.generate(body.elderId(), body.periodStart(), body.periodEnd(), requestedBy).stream()
				.map(ReportResponses.ReportView::of)
				.toList();
	}

	/** The filed reports, most recent period first, the three versions of a period together. */
	@GetMapping
	@PreAuthorize("hasRole('MANAGER')")
	public ReportResponses.Page list(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) Long elderId,
			@RequestParam(required = false) Report.Audience audience) {

		return ReportResponses.Page.of(service.page(elderId, audience, page, size));
	}

	/** One report: its sections, its disclaimer if it has one, and every correction. */
	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ReportResponses.Detail get(@PathVariable Long id) {
		return ReportResponses.Detail.of(service.findDetail(id));
	}

	/** The one change a filed report accepts: a dated, signed correction appended to it. */
	@PostMapping("/{id}/amendments")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('MANAGER')")
	public ReportResponses.Amendment amend(
			@PathVariable Long id,
			@Valid @RequestBody ReportRequests.Amend body,
			Principal principal) {

		Long author = identity.require(principal.getName()).id();
		return ReportResponses.Amendment.of(service.amend(id, body.note(), author));
	}
}
