package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for absence_report. Used inside the persistence layer only; never exposed outwards. */
interface AbsenceReportJpaRepository extends JpaRepository<AbsenceReportJpaEntity, Long> {
}
