package sg.nus.carelink.visit.infrastructure.persistence.repository;

import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import sg.nus.carelink.visit.infrastructure.persistence.entity.VisitJpaEntity;

/**
 * Spring Data repository for visit.
 *
 * <p>Used by persistence adapters only; never exposed outside the
 * infrastructure layer.
 */
public interface VisitJpaRepository
        extends JpaRepository<VisitJpaEntity, Long>,
                JpaSpecificationExecutor<VisitJpaEntity> {

    /**
     * EL01: finds completed visits for an elder, with the most recent
     * scheduled visit first.
     */
    List<VisitJpaEntity>
            findByElderIdAndStatusOrderByScheduledStartDesc(
                    Long elderId,
                    VisitJpaEntity.Status status
            );

    /**
     * Checks whether the caregiver is assigned to any elder in the
     * supplied set.
     */
    boolean existsByElderIdInAndCaregiverId(
            Set<Long> elderIds,
            Long caregiverId
    );
}