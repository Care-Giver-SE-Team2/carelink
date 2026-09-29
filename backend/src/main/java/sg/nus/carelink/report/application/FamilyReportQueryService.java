package sg.nus.carelink.report.application;

import java.util.List;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import sg.nus.carelink.profile.application.FamilyAccessQuery;
import sg.nus.carelink.profile.application.FamilyReadAudit;
import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportPage;
import sg.nus.carelink.report.domain.repository.ReportRepository;

/**
 * Reads filed family reports under the session's current bindings and records the outcome.
 *
 * @author Wang Zhili
 */
@Service
public class FamilyReportQueryService {

	private final ReportRepository reports;
	private final FamilyAccessQuery access;
	private final FamilyReadAudit audit;

	public FamilyReportQueryService(ReportRepository reports, FamilyAccessQuery access, FamilyReadAudit audit) {
		this.reports = reports;
		this.access = access;
		this.audit = audit;
	}

	/** Lists report metadata after HTTP validation; authorization is rechecked on every read. */
	public ReportPage page(String username, Long elderId, Report.Audience audience, int page, int size) {
		Report.Audience requestedAudience = audience == null ? Report.Audience.FAMILY : audience;
		String scope = "elderId=%s;audience=%s;page=%d;size=%d".formatted(elderId, requestedAudience, page, size);
		return audit.read(username, FamilyReadAudit.Resource.REPORTS, null, scope, () -> {
			if (requestedAudience != Report.Audience.FAMILY) {
				throw new AccessDeniedException("Only FAMILY reports are readable");
			}
			Set<Long> readable = access.readableElderIds(username);
			if (elderId != null && !readable.contains(elderId)) {
				throw new AccessDeniedException("A readable elder binding is required");
			}
			if (readable.isEmpty()) {
				return new ReportPage(List.of(), page, size, 0);
			}
			return reports.findFamilyPage(elderId == null ? readable : Set.of(elderId), page, size);
		});
	}
}
