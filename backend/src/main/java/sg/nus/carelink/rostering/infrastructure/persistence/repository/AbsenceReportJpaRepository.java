package sg.nus.carelink.rostering.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.rostering.infrastructure.persistence.entity.AbsenceReportJpaEntity;

/** Spring Data repository for absence_report. Used by persistence.adapter only; never exposed outwards. */
public interface AbsenceReportJpaRepository extends JpaRepository<AbsenceReportJpaEntity, Long> {
}
