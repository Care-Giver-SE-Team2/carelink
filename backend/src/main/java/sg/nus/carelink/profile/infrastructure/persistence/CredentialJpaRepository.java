package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for credential. Used inside the persistence layer only; never exposed outwards. */
interface CredentialJpaRepository extends JpaRepository<CredentialJpaEntity, Long> {
}
