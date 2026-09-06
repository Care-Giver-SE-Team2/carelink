package sg.nus.carelink.report.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for report. Used inside the persistence layer only; never exposed outwards. */
interface ReportJpaRepository extends JpaRepository<ReportJpaEntity, Long> {
}
