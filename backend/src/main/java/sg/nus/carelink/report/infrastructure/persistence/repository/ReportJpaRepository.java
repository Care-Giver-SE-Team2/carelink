package sg.nus.carelink.report.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.report.infrastructure.persistence.entity.ReportJpaEntity;

/** Spring Data repository for report. Used by persistence.adapter only; never exposed outwards. */
public interface ReportJpaRepository extends JpaRepository<ReportJpaEntity, Long> {
}
