package sg.nus.carelink.rostering.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.rostering.domain.model.AbsenceReport;
import sg.nus.carelink.rostering.domain.repository.AbsenceReportRepository;
import sg.nus.carelink.rostering.infrastructure.persistence.repository.AbsenceReportJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class AbsenceReportRepositoryAdapter implements AbsenceReportRepository {

	private final AbsenceReportJpaRepository jpa;

	AbsenceReportRepositoryAdapter(AbsenceReportJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<AbsenceReport> findById(Long id) {
		return jpa.findById(id).map(AbsenceReportMapper::toDomain);
	}

	@Override
	public AbsenceReport save(AbsenceReport absenceReport) {
		return AbsenceReportMapper.toDomain(jpa.save(AbsenceReportMapper.toEntity(absenceReport)));
	}
}
