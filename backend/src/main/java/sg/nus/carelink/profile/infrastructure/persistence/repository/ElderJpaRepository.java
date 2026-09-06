package sg.nus.carelink.profile.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.profile.infrastructure.persistence.entity.ElderJpaEntity;

/** Spring Data repository for elder. Used by persistence.adapter only; never exposed outwards. */
public interface ElderJpaRepository extends JpaRepository<ElderJpaEntity, Long> {
}
