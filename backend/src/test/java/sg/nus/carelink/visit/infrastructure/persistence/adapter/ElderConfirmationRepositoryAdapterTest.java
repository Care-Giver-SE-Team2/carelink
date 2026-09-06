package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.visit.domain.model.ElderConfirmation;
import sg.nus.carelink.visit.infrastructure.persistence.entity.ElderConfirmationJpaEntity;
import sg.nus.carelink.visit.infrastructure.persistence.repository.ElderConfirmationJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class ElderConfirmationRepositoryAdapterTest {

	private final ElderConfirmationJpaRepository jpa = mock(ElderConfirmationJpaRepository.class);
	private final ElderConfirmationRepositoryAdapter adapter = new ElderConfirmationRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		ElderConfirmationJpaEntity entity = new ElderConfirmationJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<ElderConfirmation> found = adapter.findById(7L);

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
		ElderConfirmationJpaEntity entity = new ElderConfirmationJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(ElderConfirmationJpaEntity.class))).thenReturn(entity);

		ElderConfirmation saved = adapter.save(ElderConfirmationMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
