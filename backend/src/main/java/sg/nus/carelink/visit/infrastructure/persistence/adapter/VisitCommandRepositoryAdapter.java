package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.domain.repository.VisitCommandRepository;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitJpaRepository;

@Repository
class VisitCommandRepositoryAdapter implements VisitCommandRepository {
    private final VisitJpaRepository jpa;
    private final JdbcTemplate jdbc;
    private final EntityManager em;
    VisitCommandRepositoryAdapter(VisitJpaRepository jpa, JdbcTemplate jdbc, EntityManager em) {
        this.jpa = jpa; this.jdbc = jdbc; this.em = em;
    }
    public Optional<Visit> lock(Long id) {
        return jpa.findForCommand(id).map(row -> {
            em.refresh(row);
            return VisitMapper.toDomain(row);
        });
    }
    public Visit save(Visit visit) {
        // Advance the parent version even for a task result or another report in EXCEPTION.
        int changed = jdbc.update("""
                update visit set status=?, checked_in_at=?, checked_out_at=?, state_deadline=?, version=version+1
                where id=? and version=?
                """, visit.status().name(), visit.checkedInAt(), visit.checkedOutAt(), visit.stateDeadline(), visit.id(), visit.version());
        if (changed != 1) throw new BusinessRuleViolation("VISIT_VERSION_CONFLICT", "Visit changed. Refresh before continuing.");
        var row = jpa.findById(visit.id()).orElseThrow();
        em.refresh(row);
        return VisitMapper.toDomain(row);
    }
}
