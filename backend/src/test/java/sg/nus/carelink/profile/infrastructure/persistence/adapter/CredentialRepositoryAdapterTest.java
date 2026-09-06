package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.Credential;
import sg.nus.carelink.profile.infrastructure.persistence.entity.CredentialJpaEntity;
import sg.nus.carelink.profile.infrastructure.persistence.repository.CredentialJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class CredentialRepositoryAdapterTest {

	private final CredentialJpaRepository jpa = mock(CredentialJpaRepository.class);
	private final CredentialRepositoryAdapter adapter = new CredentialRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		CredentialJpaEntity entity = new CredentialJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<Credential> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		CredentialJpaEntity entity = new CredentialJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(CredentialJpaEntity.class))).thenReturn(entity);

		Credential saved = adapter.save(CredentialMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
