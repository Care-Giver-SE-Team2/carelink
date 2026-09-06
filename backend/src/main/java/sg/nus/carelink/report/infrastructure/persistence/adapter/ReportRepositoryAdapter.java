package sg.nus.carelink.report.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.repository.ReportRepository;
import sg.nus.carelink.report.infrastructure.persistence.repository.ReportJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class ReportRepositoryAdapter implements ReportRepository {

	private final ReportJpaRepository jpa;

	ReportRepositoryAdapter(ReportJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Report> findById(Long id) {
		return jpa.findById(id).map(ReportMapper::toDomain);
	}

	@Override
	public Report save(Report report) {
		return ReportMapper.toDomain(jpa.save(ReportMapper.toEntity(report)));
	}
}
