package sg.nus.carelink.visit.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Set;

import sg.nus.carelink.visit.infrastructure.persistence.entity.VisitJpaEntity;

/** Spring Data repository for visit. Used by persistence.adapter only; never exposed outwards. */
public interface VisitJpaRepository extends JpaRepository<VisitJpaEntity, Long>, JpaSpecificationExecutor<VisitJpaEntity> {
	boolean existsByElderIdInAndCaregiverId(Set<Long> elderIds, Long caregiverId);
}
