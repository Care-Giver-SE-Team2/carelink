package sg.nus.carelink.shared.audit.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for audit_log. Used inside the persistence layer only; never exposed outwards. */
interface AuditLogJpaRepository extends JpaRepository<AuditLogJpaEntity, Long> {
}
