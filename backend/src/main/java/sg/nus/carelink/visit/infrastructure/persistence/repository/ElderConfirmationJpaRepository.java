package sg.nus.carelink.visit.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.visit.infrastructure.persistence.entity.ElderConfirmationJpaEntity;

/** Spring Data repository for elder_confirmation. Used by persistence.adapter only; never exposed outwards. */
public interface ElderConfirmationJpaRepository extends JpaRepository<ElderConfirmationJpaEntity, Long> {
}
