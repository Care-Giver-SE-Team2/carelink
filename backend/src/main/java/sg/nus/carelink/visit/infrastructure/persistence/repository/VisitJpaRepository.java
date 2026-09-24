package sg.nus.carelink.visit.infrastructure.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.visit.infrastructure.persistence.entity.VisitJpaEntity;

/**
 * Spring Data repository for visit.
 */
public interface VisitJpaRepository
        extends JpaRepository<VisitJpaEntity, Long> {

    List<VisitJpaEntity>
            findByElderIdAndStatusOrderByScheduledStartDesc(
                    Long elderId,
                    VisitJpaEntity.Status status
            );
}