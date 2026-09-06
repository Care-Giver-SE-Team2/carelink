package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for credential_type. Used inside the persistence layer only; never exposed outwards. */
interface CredentialTypeJpaRepository extends JpaRepository<CredentialTypeJpaEntity, Long> {
}
